import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material';
import { transferCompanies, getTransferProgress } from '../utils/jam-api';
import { TransferProgressDialog } from './TransferProgressDialog';

interface TransferCompaniesProps {
  isOpen: boolean;
  onClose: () => void;
  sourceCollectionId: string;
  selectedCompanies: number[];
  availableCollections: Array<{
    id: string;
    collection_name: string;
  }>;
}

export function TransferCompanies({
  isOpen,
  onClose,
  sourceCollectionId,
  selectedCompanies,
  availableCollections,
}: TransferCompaniesProps) {
  const [targetCollectionId, setTargetCollectionId] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferProgress, setTransferProgress] = useState<{
    status: string;
    completed: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [targetCollectionName, setTargetCollectionName] = useState<string>('');
  const [sourceCollectionName, setSourceCollectionName] = useState<string>('');

  const handleTransfer = async () => {
    if (!targetCollectionId) {
      setError('Please select a target collection');
      return;
    }

    try {
      setIsTransferring(true);
      setError(null);
      setIsComplete(false);
      setTransferProgress({
        status: 'in_progress',
        completed: 0,
        total: selectedCompanies.length
      });

      const response = await transferCompanies(
        sourceCollectionId,
        targetCollectionId,
        selectedCompanies
      );

      // Start polling for progress
      const pollProgress = async () => {
        try {
          const progress = await getTransferProgress(response.transferId);
          setTransferProgress(progress);

          if (progress.status === 'completed') {
            setIsComplete(true);
          } else if (progress.status === 'failed') {
            setError('Transfer failed');
            setIsTransferring(false);
          } else {
            // Continue polling
            setTimeout(pollProgress, 1000);
          }
        } catch (error) {
          console.error('Error polling transfer progress:', error);
          setError('Error checking transfer progress');
          setIsTransferring(false);
        }
      };

      pollProgress();
    } catch (error) {
      console.error('Error transferring companies:', error);
      setError('Failed to transfer companies');
      setIsTransferring(false);
    }
  };

  const handleClose = () => {
    if (!isTransferring) {
      setTargetCollectionId('');
      setTransferProgress(null);
      setError(null);
      setIsComplete(false);
      onClose();
    }
  };

  const handleTransferDialogClose = () => {
    setIsTransferring(false);
    setTransferProgress(null);
    setError(null);
    setIsComplete(false);
    setTargetCollectionId('');
    onClose();
  };

  const handleTargetChange = (e: SelectChangeEvent<string>) => {
    const selectedCollection = availableCollections.find(c => c.id === e.target.value);
    setTargetCollectionId(e.target.value);
    setTargetCollectionName(selectedCollection?.collection_name || '');
  };

  // Get source collection name
  React.useEffect(() => {
    const sourceCollection = availableCollections.find(c => c.id === sourceCollectionId);
    if (sourceCollection) {
      setSourceCollectionName(sourceCollection.collection_name);
    }
  }, [sourceCollectionId, availableCollections]);

  return (
    <>
      <Dialog open={isOpen && !isTransferring} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Transfer Companies</DialogTitle>
        <DialogContent>
          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Target Collection</InputLabel>
            <Select
              value={targetCollectionId}
              onChange={handleTargetChange}
              label="Target Collection"
            >
              {availableCollections
                .filter((collection) => collection.id !== sourceCollectionId)
                .map((collection) => (
                  <MenuItem key={collection.id} value={collection.id}>
                    {collection.collection_name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleTransfer}
            disabled={!targetCollectionId}
            variant="contained"
            color="primary"
          >
            Transfer
          </Button>
        </DialogActions>
      </Dialog>

      <TransferProgressDialog
        isOpen={isTransferring}
        onClose={handleTransferDialogClose}
        progress={transferProgress}
        sourceCollectionName={sourceCollectionName}
        targetCollectionName={targetCollectionName}
        isComplete={isComplete}
        error={error}
      />
    </>
  );
} 