import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { ITransferProgress, transferCompanies, getTransferProgress } from '../utils/jam-api';

interface TransferCompaniesProps {
    sourceCollectionId: string;
    targetCollectionId: string;
    selectedCompanies: number[];
    onTransferComplete: () => void;
    onClose: () => void;
}

const TransferCompanies = ({
    sourceCollectionId,
    targetCollectionId,
    selectedCompanies,
    onTransferComplete,
    onClose
}: TransferCompaniesProps) => {
    const [transferProgress, setTransferProgress] = useState<ITransferProgress | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleTransfer = async () => {
        try {
            setError(null);
            const progress = await transferCompanies({
                sourceCollectionId,
                targetCollectionId,
                companyIds: selectedCompanies
            });
            setTransferProgress(progress);
            onTransferComplete();
        } catch (err) {
            setError('Failed to start transfer');
        }
    };

    return (
        <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Transfer Companies</DialogTitle>
            <DialogContent>
                {error && (
                    <Typography color="error" sx={{ mb: 2 }}>
                        {error}
                    </Typography>
                )}
                {transferProgress ? (
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
                ) : (
                    <Typography>
                        Are you sure you want to transfer {selectedCompanies.length} companies?
                    </Typography>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={transferProgress?.status === 'in_progress'}>
                    Cancel
                </Button>
                {!transferProgress && (
                    <Button onClick={handleTransfer} variant="contained" color="primary">
                        Transfer
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default TransferCompanies; 