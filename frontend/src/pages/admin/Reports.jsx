import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Tabs,
    Tab,
    Card,
    CardContent,
    CircularProgress,
    Alert,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { reportsApi } from '../../api';

const ReportsPage = () => {
    const [tab, setTab] = useState(0);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const reportTypes = [
        { label: 'Overdue', fetch: () => reportsApi.getOverdueReport() },
        { label: 'Circulation', fetch: () => reportsApi.getCirculationReport() },
        { label: 'Inventory', fetch: () => reportsApi.getInventorySummary() },
        { label: 'Member Activity', fetch: () => reportsApi.getMemberActivityReport() },
        { label: 'Debt Aging', fetch: () => reportsApi.getDebtAgingReport() },
        { label: 'Turnaround', fetch: () => reportsApi.getTurnaroundMetrics() },
    ];

    useEffect(() => {
        const fetchReport = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await reportTypes[tab].fetch();
                setData(response.data || []);
            } catch (err) {
                setError(err.message);
                setData([]);
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [tab]);

    const columns = data.length > 0
        ? [
            { field: 'sl_no', headerName: 'Sl. No', width: 70 },
            ...Object.keys(data[0]).map((key) => ({
                field: key,
                headerName: key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
                flex: 1,
                minWidth: 120,
            }))
        ]
        : [];

    return (
        <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
                Reports
            </Typography>

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
                {reportTypes.map((r, i) => (
                    <Tab key={i} label={r.label} />
                ))}
            </Tabs>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Card>
                <CardContent>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : data.length === 0 ? (
                        <Typography color="text.secondary" textAlign="center" py={4}>
                            No data available for this report
                        </Typography>
                    ) : (
                        <Box sx={{ height: 400 }}>
                            <DataGrid
                                rows={data.map((d, i) => ({ ...d, sl_no: i + 1 }))}
                                columns={columns}
                                getRowId={(row, idx) => row.loan_id || row.book_id || row.member_id || row.title || idx}
                                pageSizeOptions={[10, 25]}
                                initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                            />
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
};

export default ReportsPage;
