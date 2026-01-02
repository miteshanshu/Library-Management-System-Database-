import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Grid, Chip, Alert, Divider } from '@mui/material';
import { studentApi } from '../../api';

const MyFeesPage = () => {
    const [feesData, setFeesData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchFees = async () => {
            try {
                const response = await studentApi.getMyFees();
                setFeesData(response.data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchFees();
    }, []);

    if (loading) return <Typography>Loading...</Typography>;

    return (
        <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>My Fees</Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* Summary */}
            <Grid container spacing={3} mb={4}>
                <Grid item xs={12} sm={6}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary">Total Fees</Typography>
                            <Typography variant="h4" fontWeight={700}>${(feesData?.total_fees || 0).toFixed(2)}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <Card sx={{ backgroundColor: 'error.light' }}>
                        <CardContent>
                            <Typography color="white">Unpaid Fees</Typography>
                            <Typography variant="h4" fontWeight={700} color="white">${(feesData?.unpaid_fees || 0).toFixed(2)}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Fee List */}
            <Card>
                <CardContent>
                    <Typography variant="h6" fontWeight={600} gutterBottom>Fee Details</Typography>
                    <Divider sx={{ mb: 2 }} />
                    {feesData?.fees?.length === 0 ? (
                        <Typography color="text.secondary">No fees found</Typography>
                    ) : (
                        feesData?.fees?.map((fee) => (
                            <Box key={fee.fee_id} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                                <Box>
                                    <Typography>{fee.fee_type}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Assessed: {new Date(fee.assessed_date).toLocaleDateString()}
                                    </Typography>
                                </Box>
                                <Box sx={{ textAlign: 'right' }}>
                                    <Typography fontWeight={600}>${parseFloat(fee.amount).toFixed(2)}</Typography>
                                    <Chip label={fee.status} size="small" color={fee.status === 'PAID' ? 'success' : 'error'} />
                                </Box>
                            </Box>
                        ))
                    )}
                </CardContent>
            </Card>
        </Box>
    );
};

export default MyFeesPage;
