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
  CircularProgress,
} from '@mui/material';
import { transferCompanies, getTransferProgress } from '../utils/jam-api';

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

  const handleTransfer = async () => {
    if (!targetCollectionId) {
      setError('Please select a target collection');
      return;
    }

    try {
      setIsTransferring(true);
      setError(null);
      setIsComplete(false);
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
            setIsTransferring(false);
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

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Transfer Companies</DialogTitle>
      <DialogContent>
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        {isComplete ? (
          <Typography variant="body1" sx={{ mt: 2, color: 'success.main' }}>
            Transfer completed successfully!
          </Typography>
        ) : (
          <>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Target Collection</InputLabel>
              <Select
                value={targetCollectionId}
                onChange={(e) => setTargetCollectionId(e.target.value)}
                disabled={isTransferring}
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
            {transferProgress && (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <CircularProgress
                  variant="determinate"
                  value={(transferProgress.completed / transferProgress.total) * 100}
                  size={60}
                />
                <Typography variant="body1" sx={{ mt: 2 }}>
                  Transferring companies... {transferProgress.completed} of {transferProgress.total}
                </Typography>
              </div>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isTransferring}>
          {isComplete ? 'Close' : 'Cancel'}
        </Button>
        {!isComplete && (
          <Button
            onClick={handleTransfer}
            disabled={!targetCollectionId || isTransferring}
            variant="contained"
            color="primary"
          >
            {isTransferring ? 'Transferring...' : 'Transfer'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
} 