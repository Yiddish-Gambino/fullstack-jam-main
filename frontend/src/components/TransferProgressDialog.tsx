import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';
import { useEffect, useState } from 'react';

interface TransferProgressDialogProps {
    isOpen: boolean;
    onClose: () => void;
    progress: {
        status: 'in_progress' | 'completed' | 'failed';
        total: number;
        completed: number;
    } | null;
    sourceCollectionName: string;
    targetCollectionName: string;
    error: string | null;
}

export function TransferProgressDialog({
    isOpen,
    onClose,
    progress,
    sourceCollectionName,
    targetCollectionName,
    error
}: TransferProgressDialogProps) {
    const [dots, setDots] = useState('');
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    useEffect(() => {
        let interval: number;
        if (isOpen && progress?.status === 'in_progress') {
            interval = window.setInterval(() => {
                setDots(prev => prev.length >= 3 ? '' : prev + '.');
            }, 500);

            // Calculate estimated time based on number of companies (100ms per company)
            const estimatedTime = progress.total * 100;
            setTimeLeft(estimatedTime);

            // Start countdown
            const countdownInterval = window.setInterval(() => {
                setTimeLeft(prev => {
                    if (prev === null || prev <= 0) return 0;
                    return prev - 100;
                });
            }, 100);

            return () => {
                clearInterval(interval);
                clearInterval(countdownInterval);
            };
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isOpen, progress]);

    const formatTimeLeft = (ms: number): string => {
        const seconds = Math.ceil(ms / 1000);
        if (seconds < 60) {
            return `${seconds} second${seconds !== 1 ? 's' : ''}`;
        }
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        if (remainingSeconds === 0) {
            return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        }
        return `${minutes} minute${minutes !== 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
    };

    const getMessage = () => {
        if (error) return error;
        if (!progress) return '';

        switch (progress.status) {
            case 'in_progress':
                return `Transferring companies from ${sourceCollectionName} to ${targetCollectionName}${dots}`;
            case 'completed':
                return `Successfully transferred ${progress.completed} out of ${progress.total} companies from ${sourceCollectionName} to ${targetCollectionName}`;
            case 'failed':
                return `Failed to transfer companies from ${sourceCollectionName} to ${targetCollectionName}`;
            default:
                return '';
        }
    };

    return (
        <Dialog 
            open={isOpen} 
            onClose={progress?.status === 'in_progress' ? undefined : onClose}
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle>
                {progress?.status === 'in_progress' ? 'Transfer in Progress' : 
                 progress?.status === 'completed' ? 'Transfer Complete' : 
                 'Transfer Failed'}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="body1" gutterBottom>
                        {getMessage()}
                    </Typography>
                    {progress?.status === 'in_progress' && timeLeft !== null && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Estimated time remaining: {formatTimeLeft(timeLeft)}
                        </Typography>
                    )}
                </Box>
            </DialogContent>
            {progress?.status !== 'in_progress' && (
                <DialogActions>
                    <Button onClick={onClose} color="primary">
                        Confirm
                    </Button>
                </DialogActions>
            )}
        </Dialog>
    );
} 