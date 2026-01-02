import { useState } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    TextField,
    Button,
    Alert,
    Grid,
    Chip,
    Divider,
    List,
    ListItem,
    ListItemText,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { librarianApi } from '../../api';

const StudentSearchPage = () => {
    const [searchType, setSearchType] = useState('card');
    const [searchValue, setSearchValue] = useState('');
    const [student, setStudent] = useState(null);
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSearch = async () => {
        if (!searchValue.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const params = searchType === 'card'
                ? { card_number: searchValue }
                : { email: searchValue };
            const response = await librarianApi.searchStudent(params);
            setStudent(response.data);

            // Fetch loans
            const loansRes = await librarianApi.getStudentLoans(response.data.member_id);
            setLoans(loansRes.data || []);
        } catch (err) {
            setError(err.message);
            setStudent(null);
            setLoans([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
                Student Search
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

            {/* Search Form */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                        <TextField
                            select
                            label="Search By"
                            value={searchType}
                            onChange={(e) => setSearchType(e.target.value)}
                            SelectProps={{ native: true }}
                            sx={{ width: 150 }}
                        >
                            <option value="card">Card Number</option>
                            <option value="email">Email</option>
                        </TextField>
                        <TextField
                            label={searchType === 'card' ? 'Card Number' : 'Email'}
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            sx={{ flex: 1 }}
                        />
                        <Button
                            variant="contained"
                            startIcon={<SearchIcon />}
                            onClick={handleSearch}
                            disabled={loading}
                        >
                            Search
                        </Button>
                    </Box>
                </CardContent>
            </Card>

            {/* Student Profile */}
            {student && (
                <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" fontWeight={600} gutterBottom>
                                    Student Profile
                                </Typography>
                                <Divider sx={{ mb: 2 }} />
                                <Typography><strong>Name:</strong> {student.first_name} {student.last_name}</Typography>
                                <Typography><strong>Card:</strong> {student.card_number}</Typography>
                                <Typography><strong>Email:</strong> {student.email}</Typography>
                                <Typography><strong>Phone:</strong> {student.phone || 'N/A'}</Typography>
                                <Chip
                                    label={student.status}
                                    color={student.status === 'ACTIVE' ? 'success' : 'error'}
                                    sx={{ mt: 2 }}
                                />
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={8}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" fontWeight={600} gutterBottom>
                                    Loans ({loans.length})
                                </Typography>
                                <Divider sx={{ mb: 2 }} />
                                {loans.length === 0 ? (
                                    <Typography color="text.secondary">No loans found</Typography>
                                ) : (
                                    <List disablePadding>
                                        {loans.slice(0, 10).map((loan) => (
                                            <ListItem key={loan.loan_id} divider>
                                                <ListItemText
                                                    primary={loan.title}
                                                    secondary={`Due: ${new Date(loan.due_date).toLocaleDateString()} | Barcode: ${loan.barcode}`}
                                                />
                                                <Chip
                                                    label={loan.status}
                                                    size="small"
                                                    color={loan.status === 'OVERDUE' ? 'error' : loan.status === 'RETURNED' ? 'success' : 'primary'}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}
        </Box>
    );
};

export default StudentSearchPage;
