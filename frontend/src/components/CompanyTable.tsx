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
  }, [props.selectedCollectionId]);

  const handleSelectAll = async () => {
    setIsSelectingAll(true);
    try {
      // Fetch all companies in the collection
      const allCompanies = await getCollectionsById(props.selectedCollectionId, 0, total || 0);
      setSelectedRows(allCompanies.companies.map(company => company.id));
    } catch (error) {
      console.error('Error selecting all companies:', error);
    } finally {
      setIsSelectingAll(false);
    }
  };

  return (
    <div style={{ height: 600, width: "100%" }}>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Button
          variant="contained"
          onClick={handleSelectAll}
          disabled={isSelectingAll}
        >
          {isSelectingAll ? 'Selecting...' : 'Select All'}
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
        onRowSelectionModelChange={(newSelection) => {
          setSelectedRows(newSelection);
        }}
        rowSelectionModel={selectedRows}
      />
    </div>
  );
};

export default CompanyTable;
