import uuid
from typing import Optional, List
import logging

from fastapi import APIRouter, Depends, Query, BackgroundTasks, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, text, insert
from sqlalchemy.orm import Session

from backend.db import database
from backend.routes.companies import (
    CompanyBatchOutput,
    fetch_companies_with_liked,
)

# Get logger for this module
logger = logging.getLogger(__name__)

# Add some test logging
logger.info("Collections router initialized")

router = APIRouter(
    prefix="/collections",
    tags=["collections"],
)

# Store transfer progress in memory (in a real app, this would be in a database)
transfer_progress = {}

class CompanyCollectionMetadata(BaseModel):
    id: uuid.UUID
    collection_name: str

class CompanyCollectionOutput(CompanyBatchOutput, CompanyCollectionMetadata):
    pass

class TransferRequest(BaseModel):
    sourceCollectionId: uuid.UUID
    targetCollectionId: uuid.UUID
    companyIds: list[int]

class TransferProgress(BaseModel):
    status: str
    completed: int
    total: int
    transferId: str

@router.get("", response_model=list[CompanyCollectionMetadata])
def get_all_collection_metadata(
    db: Session = Depends(database.get_db),
):
    collections = db.query(database.CompanyCollection).all()

    return [
        CompanyCollectionMetadata(
            id=collection.id,
            collection_name=collection.collection_name,
        )
        for collection in collections
    ]

@router.get("/{collection_id}", response_model=CompanyCollectionOutput)
def get_company_collection_by_id(
    collection_id: uuid.UUID,
    offset: int = Query(
        0, description="The number of items to skip from the beginning"
    ),
    limit: int = Query(10, description="The number of items to fetch"),
    db: Session = Depends(database.get_db),
):
    # First get total count
    total_count = (
        db.query(database.CompanyCollectionAssociation)
        .filter(database.CompanyCollectionAssociation.collection_id == collection_id)
        .count()
    )

    # Then get paginated companies
    query = (
        db.query(database.CompanyCollectionAssociation, database.Company)
        .join(database.Company, database.Company.id == database.CompanyCollectionAssociation.company_id)
        .filter(database.CompanyCollectionAssociation.collection_id == collection_id)
        .offset(offset)
        .limit(limit)
    )

    companies = fetch_companies_with_liked(db, [company.id for _, company in query])

    return CompanyCollectionOutput(
        id=collection_id,
        collection_name=db.query(database.CompanyCollection)
        .get(collection_id)
        .collection_name,
        companies=companies,
        total=total_count,
    )

@router.post("/transfer", response_model=TransferProgress)
async def transfer_companies(
    request: TransferRequest,
    db: Session = Depends(database.get_db)
):
    try:
        # Get source and target collections
        source_collection = db.query(database.CompanyCollection).filter(
            database.CompanyCollection.id == request.sourceCollectionId
        ).first()
        target_collection = db.query(database.CompanyCollection).filter(
            database.CompanyCollection.id == request.targetCollectionId
        ).first()
        
        if not source_collection or not target_collection:
            raise HTTPException(status_code=404, detail="Source or target collection not found")
        
        # Start transaction
        transfer_id = str(uuid.uuid4())
        transfer = database.Transfer(
            id=transfer_id,
            source_collection_id=request.sourceCollectionId,
            target_collection_id=request.targetCollectionId,
            status="in_progress",
            total_companies=len(request.companyIds)
        )
        db.add(transfer)
        db.commit()

        # Initialize transfer progress in memory
        transfer_progress[transfer_id] = {
            "status": "in_progress",
            "completed": 0,
            "total": len(request.companyIds),
            "transferId": transfer_id
        }
        
        # Process each company
        completed = 0
        for company_id in request.companyIds:
            try:
                # Get the association from source collection
                source_association = db.query(database.CompanyCollectionAssociation).filter(
                    database.CompanyCollectionAssociation.company_id == company_id,
                    database.CompanyCollectionAssociation.collection_id == request.sourceCollectionId
                ).first()

                if not source_association:
                    logger.warning(f"Company {company_id} not found in source collection")
                    continue

                # If source and target are the same, just delete the association (removing from collection)
                if request.sourceCollectionId == request.targetCollectionId:
                    db.delete(source_association)
                    db.commit()
                    completed += 1
                    continue

                # For other collections, handle normal transfer
                # Check if company already exists in target collection
                target_association = db.query(database.CompanyCollectionAssociation).filter(
                    database.CompanyCollectionAssociation.company_id == company_id,
                    database.CompanyCollectionAssociation.collection_id == request.targetCollectionId
                ).first()

                 # Create new association in target collection
                new_association = database.CompanyCollectionAssociation(
                    company_id=company_id,
                    collection_id=request.targetCollectionId
                )

                ignored = db.query(database.CompanyCollectionAssociation.company_id).filter(
                    database.CompanyCollectionAssociation.collection_id == db.query(database.CompanyCollection.id).filter(
                    database.CompanyCollection.collection_name == "Companies to Ignore List"
                ).scalar()).all()

                ignored_ids = [row[0] for row in ignored]
        
                if company_id in ignored_ids:
                    logger.info(f"Company {company_id} is in Ignored List, skipping add")
                    continue

                if target_association:
                    logger.info(f"Company {company_id} already exists in target collection, skipping add")
                else:
                    db.add(new_association)

               
                
                # Only delete from source if it's not the My List
                if source_collection.collection_name != "My List":
                    db.delete(source_association)
                
                db.commit()
                completed += 1
                
                # Update transfer progress
                transfer.completed_companies = completed
                transfer_progress[transfer_id]["completed"] = completed
                db.commit()
                    
            except Exception as e:
                logger.error(f"Error processing company {company_id}: {str(e)}")
                continue
        
        # Update transfer status
        transfer.status = "completed"
        transfer_progress[transfer_id]["status"] = "completed"
        db.commit()
        
        return {
            "status": "completed",
            "completed": completed,
            "total": len(request.companyIds),
            "transferId": transfer_id
        }
        
    except Exception as e:
        logger.error(f"Error in transfer_companies: {str(e)}")
        if transfer_id in transfer_progress:
            transfer_progress[transfer_id]["status"] = "failed"
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/transfer/{transfer_id}", response_model=TransferProgress)
def get_transfer_progress(transfer_id: str):
    if transfer_id not in transfer_progress:
        raise HTTPException(status_code=404, detail="Transfer not found")
    return transfer_progress[transfer_id]
