import { Button, Stack, Typography } from "@mui/material";
import { DataGrid, GridRowSelectionModel } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import { getCollectionsById, ICompany, ICollection, transferCompanies, getTransferProgress } from "../utils/jam-api";
import { TransferProgressDialog } from "./TransferProgressDialog";

interface LikedCompaniesTableProps {
    selectedCollectionId: string;
    collections: ICollection[];
}

const LikedCompaniesTable = ({ selectedCollectionId, collections }: LikedCompaniesTableProps) => {
    const [response, setResponse] = useState<ICompany[]>([]);
    const [total, setTotal] = useState<number>();
    const [offset, setOffset] = useState<number>(0);
    const [pageSize, setPageSize] = useState(25);
    const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>([]);
    const [isSelectingAll, setIsSelectingAll] = useState(false);
    const [allCompanyIds, setAllCompanyIds] = useState<number[]>([]);
    const [myListId, setMyListId] = useState<string | null>(null);
    const [isTransferring, setIsTransferring] = useState(false);
    const [transferProgress, setTransferProgress] = useState<{
        status: string;
        completed: number;
        total: number;
    } | null>(null);
    const [sourceCollectionName, setSourceCollectionName] = useState<string>("");
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        // Get My List ID
        const myList = collections.find(c => c.collection_name === "My List");
        setMyListId(myList?.id || null);

        // Get source collection name
        const sourceCollection = collections.find(c => c.id === selectedCollectionId);
        setSourceCollectionName(sourceCollection?.collection_name || "");
    }, [collections, selectedCollectionId]);

    useEffect(() => {
        getCollectionsById(selectedCollectionId, offset, pageSize).then(
            (newResponse) => {
                setResponse(newResponse.companies);
                setTotal(newResponse.total);
            }
        );
    }, [selectedCollectionId, offset, pageSize]);

    useEffect(() => {
        setOffset(0);
        setSelectedRows([]);
        setAllCompanyIds([]);
    }, [selectedCollectionId]);

    const handleSelectAll = async () => {
        if (allCompanyIds.length > 0) {
            // If all are selected, deselect all
            setSelectedRows([]);
            setAllCompanyIds([]);
            return;
        }

        setIsSelectingAll(true);
        try {
            // Fetch all companies in the collection
            const allCompanies = await getCollectionsById(selectedCollectionId, 0, total || 0);
            const allIds = allCompanies.companies.map(company => company.id);
            setAllCompanyIds(allIds);
            setSelectedRows(allIds);
        } catch (error) {
            console.error('Error selecting all companies:', error);
        } finally {
            setIsSelectingAll(false);
        }
    };

    const handleSelectionChange = async (newSelection: GridRowSelectionModel) => {
        if (allCompanyIds.length > 0) {
            // If we have all companies selected, allow deselection of specific rows
            const deselectedIds = allCompanyIds.filter(id => !newSelection.includes(id));
            if (deselectedIds.length > 0) {
                // If any companies were deselected, clear the "all selected" state
                setAllCompanyIds([]);
                setSelectedRows(newSelection);
            }
        } else {
            setSelectedRows(newSelection);
            // Check if all companies are now selected
            if (newSelection.length === total) {
                const allCompanies = await getCollectionsById(selectedCollectionId, 0, total || 0);
                const allIds = allCompanies.companies.map(company => company.id);
                if (allIds.every(id => newSelection.includes(id))) {
                    setAllCompanyIds(allIds);
                }
            }
        }
    };

    const handleUnlike = async () => {
        if (myListId && selectedRows.length > 0) {
            try {
                setIsTransferring(true);
                setIsComplete(false);
                setTransferProgress({
                    status: 'in_progress',
                    completed: 0,
                    total: selectedRows.length
                });

                const response = await transferCompanies(
                    selectedCollectionId,
                    myListId,
                    selectedRows as number[]
                );

                console.log('Transfer response:', response);

                if (!response.transferId) {
                    console.error('No transfer ID received');
                    setIsTransferring(false);
                    return;
                }

                // Start polling for progress
                const pollProgress = async () => {
                    try {
                        const progress = await getTransferProgress(response.transferId);
                        console.log('Progress update:', progress);
                        setTransferProgress(progress);
                        
                        if (progress.status === 'completed') {
                            setIsComplete(true);
                            // Refresh the table data
                            getCollectionsById(selectedCollectionId, offset, pageSize).then(
                                (newResponse) => {
                                    setResponse(newResponse.companies);
                                    setTotal(newResponse.total);
                                }
                            );
                            setSelectedRows([]);
                        } else if (progress.status === 'failed') {
                            console.error('Transfer failed');
                            setIsTransferring(false);
                        } else {
                            // Continue polling
                            setTimeout(pollProgress, 1000);
                        }
                    } catch (error) {
                        console.error('Error polling transfer progress:', error);
                        setIsTransferring(false);
                    }
                };

                pollProgress();
            } catch (error) {
                console.error('Error transferring companies:', error);
                setIsTransferring(false);
            }
        }
    };

    const handleTransferDialogClose = () => {
        setIsTransferring(false);
        setTransferProgress(null);
        setIsComplete(false);
    };

    const isAllSelected = allCompanyIds.length > 0;

    return (
        <div style={{ height: 600, width: "100%" }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
                This is a list of the Companies you have liked
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <Button
                    variant="contained"
                    onClick={handleSelectAll}
                    disabled={isSelectingAll}
                >
                    {isSelectingAll ? 'Selecting...' : isAllSelected ? 'Deselect All' : 'Select All'}
                </Button>
                {selectedRows.length > 0 && (
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleUnlike}
                        disabled={isTransferring}
                    >
                        Unlike Selected ({selectedRows.length})
                    </Button>
                )}
            </Stack>
            <DataGrid
                rows={response}
                rowHeight={30}
                columns={[
                    { field: "liked", headerName: "Liked", width: 90 },
                    { field: "id", headerName: "ID", width: 90 },
                    { field: "company_name", headerName: "Company Name", width: 200 },
                ]}
                initialState={{
                    pagination: {
                        paginationModel: { page: 0, pageSize: 25 },
                    },
                }}
                rowCount={total}
                pagination
                checkboxSelection
                paginationMode="server"
                onPaginationModelChange={(newMeta) => {
                    setPageSize(newMeta.pageSize);
                    setOffset(newMeta.page * newMeta.pageSize);
                }}
                onRowSelectionModelChange={handleSelectionChange}
                rowSelectionModel={selectedRows}
            />
            <TransferProgressDialog
                isOpen={isTransferring}
                progress={transferProgress}
                onClose={handleTransferDialogClose}
                sourceCollectionName={sourceCollectionName}
                isComplete={isComplete}
                error={null}
            />
        </div>
    );
};

export default LikedCompaniesTable; 