import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
} from '@mui/material';

interface TransferProgressDialogProps {
  isOpen: boolean;
  onClose: () => void;
  progress: {
    status: string;
    completed: number;
    total: number;
  } | null;
  sourceCollectionName?: string;
  targetCollectionName?: string;
  isComplete: boolean;
  error: string | null;
}

export function TransferProgressDialog({
  isOpen,
  onClose,
  progress,
  sourceCollectionName,
  targetCollectionName,
  isComplete,
  error,
}: TransferProgressDialogProps) {
  const isSpecialList = sourceCollectionName === 'Liked Companies List' || 
                       sourceCollectionName === 'Companies to Ignore List';

  return (
    <Dialog open={isOpen} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isComplete ? 'Transfer Complete' : 'Transferring Companies'}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        {progress && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <CircularProgress
              variant="determinate"
              value={(progress.completed / progress.total) * 100}
              size={60}
            />
            <Typography variant="body1" sx={{ mt: 2 }}>
              {isComplete 
                ? isSpecialList
                  ? `Successfully removed ${progress.completed} companies from ${sourceCollectionName}`
                  : `Successfully transferred ${progress.completed} companies to ${targetCollectionName}`
                : isSpecialList
                  ? `Removing ${progress.completed} of ${progress.total} companies from ${sourceCollectionName}`
                  : `Transferring ${progress.completed} of ${progress.total} companies to ${targetCollectionName}`
              }
            </Typography>
          </div>
        )}
      </DialogContent>
      <DialogActions>
        {isComplete && (
          <Button onClick={onClose} variant="contained" color="primary">
            Confirm
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
} 