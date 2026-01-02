import { useMemo } from 'react';
import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

import router from './routes';
import { lightTheme, darkTheme } from './theme';
import { useThemeStore } from './store';

function App() {
    const { mode } = useThemeStore();

    const theme = useMemo(() => {
        return mode === 'dark' ? darkTheme : lightTheme;
    }, [mode]);

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <RouterProvider router={router} />
            </LocalizationProvider>
        </ThemeProvider>
    );
}

export default App;
