import { Button, Stack } from "@mui/material";
import { DataGrid, GridRowSelectionModel } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import { getCollectionsById, ICompany } from "../utils/jam-api";

const CompanyTable = (props: { selectedCollectionId: string }) => {
  const [response, setResponse] = useState<ICompany[]>([]);
  const [total, setTotal] = useState<number>();
  const [offset, setOffset] = useState<number>(0);
  const [pageSize, setPageSize] = useState(25);
  const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>([]);
  const [isSelectingAll, setIsSelectingAll] = useState(false);
  const [allCompanyIds, setAllCompanyIds] = useState<number[]>([]);

  useEffect(() => {
    getCollectionsById(props.selectedCollectionId, offset, pageSize).then(
      (newResponse) => {
        setResponse(newResponse.companies);
        setTotal(newResponse.total);
      }
    );
  }, [props.selectedCollectionId, offset, pageSize]);

  useEffect(() => {
    setOffset(0);
    setSelectedRows([]);
    setAllCompanyIds([]);
  }, [props.selectedCollectionId]);

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
      const allCompanies = await getCollectionsById(props.selectedCollectionId, 0, total || 0);
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
        const allCompanies = await getCollectionsById(props.selectedCollectionId, 0, total || 0);
        const allIds = allCompanies.companies.map(company => company.id);
        if (allIds.every(id => newSelection.includes(id))) {
          setAllCompanyIds(allIds);
        }
      }
    }
  };

  const isAllSelected = allCompanyIds.length > 0;

  return (
    <div style={{ height: 600, width: "100%" }}>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Button
          variant="contained"
          onClick={handleSelectAll}
          disabled={isSelectingAll}
        >
          {isSelectingAll ? 'Selecting...' : isAllSelected ? 'Deselect All' : 'Select All'}
        </Button>
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
    </div>
  );
};

export default CompanyTable;
