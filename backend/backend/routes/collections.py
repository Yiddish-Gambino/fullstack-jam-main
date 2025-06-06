import uuid
from typing import Optional, List
import logging

from fastapi import APIRouter, Depends, Query, BackgroundTasks, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, text
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
    query = (
        db.query(database.CompanyCollectionAssociation, database.Company)
        .join(database.Company)
        .filter(database.CompanyCollectionAssociation.collection_id == collection_id)
    )

    total_count = query.with_entities(func.count()).scalar()

    results = query.offset(offset).limit(limit).all()
    companies = fetch_companies_with_liked(db, [company.id for _, company in results])

    return CompanyCollectionOutput(
        id=collection_id,
        collection_name=db.query(database.CompanyCollection)
        .get(collection_id)
        .collection_name,
        companies=companies,
        total=total_count,
    )

def process_transfer(
    transfer_id: str,
    source_collection_id: uuid.UUID,
    target_collection_id: uuid.UUID,
    company_ids: list[int],
    db: Session,
):
    try:
        total = len(company_ids)
        completed = 0

        # Update progress
        transfer_progress[transfer_id] = {
            "status": "in_progress",
            "completed": completed,
            "total": total,
        }

        # Process each company
        for company_id in company_ids:
            # Check if company exists in source collection
            source_association = (
                db.query(database.CompanyCollectionAssociation)
                .filter(database.CompanyCollectionAssociation.company_id == company_id)
                .filter(database.CompanyCollectionAssociation.collection_id == source_collection_id)
                .first()
            )

            logger.info(f"Source association: {source_association}")

            if source_association:
                logger.info(f"Company {company_id} exists in source collection")
                # Create new association in target collection
                new_association = database.CompanyCollectionAssociation(
                    company_id=company_id,
                    collection_id=target_collection_id,
                )
                db.add(new_association)

                # Remove from source collection
                db.delete(source_association)
                db.commit()

            completed += 1
            transfer_progress[transfer_id]["completed"] = completed

        # Mark transfer as completed
        transfer_progress[transfer_id]["status"] = "completed"

    except Exception as e:
        # Mark transfer as failed
        transfer_progress[transfer_id]["status"] = "failed"
        raise e

@router.post("/transfer", response_model=TransferProgress)
async def transfer_companies(
    request: TransferRequest,
    db: Session = Depends(database.get_db)
):
    try:
        logger.info(f"Starting transfer from {request.sourceCollectionId} to {request.targetCollectionId}")
        logger.info(f"Company IDs to transfer: {request.companyIds}")
        
        # Get source and target collections
        source_collection = db.query(database.CompanyCollection).filter(database.CompanyCollection.id == request.sourceCollectionId).first()
        target_collection = db.query(database.CompanyCollection).filter(database.CompanyCollection.id == request.targetCollectionId).first()
        
        if not source_collection or not target_collection:
            raise HTTPException(status_code=404, detail="Source or target collection not found")
        
        logger.info(f"Source collection: {source_collection.collection_name}")
        logger.info(f"Target collection: {target_collection.collection_name}")
        
        # Check if we're transferring from Liked Companies List
        is_from_liked_list = source_collection.collection_name == "Liked Companies List"
        
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
        
        # Process each company
        completed = 0
        for company_id in request.companyIds:
            try:
                # Get the company from source collection
                company = db.query(database.Company).filter(
                    database.Company.id == company_id,
                    database.Company.collection_id == request.sourceCollectionId
                ).first()
                
                if company:
                    # Create new company in target collection
                    new_company = database.Company(
                        id=company.id,
                        collection_id=request.targetCollectionId,
                        name=company.name,
                        description=company.description,
                        website=company.website,
                        linkedin=company.linkedin,
                        twitter=company.twitter,
                        crunchbase=company.crunchbase,
                        liked=False if is_from_liked_list else company.liked  # Set liked=False if coming from Liked List
                    )
                    db.add(new_company)
                    
                    # Delete from source collection
                    db.delete(company)
                    
                    completed += 1
                    # Update transfer progress
                    transfer.completed_companies = completed
                    db.commit()
                    
            except Exception as e:
                logger.error(f"Error processing company {company_id}: {str(e)}")
                continue
        
        # Update transfer status
        transfer.status = "completed"
        db.commit()
        
        return {
            "status": "completed",
            "completed": completed,
            "total": len(request.companyIds),
            "transferId": transfer_id
        }
        
    except Exception as e:
        logger.error(f"Error in transfer_companies: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/transfer/{transfer_id}", response_model=TransferProgress)
def get_transfer_progress(transfer_id: str):
    if transfer_id not in transfer_progress:
        raise HTTPException(status_code=404, detail="Transfer not found")
    return transfer_progress[transfer_id]
