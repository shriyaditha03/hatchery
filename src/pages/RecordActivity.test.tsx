import { describe, it } from 'vitest';
import { render } from '@testing-library/react';
import RecordActivity from './RecordActivity';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';

describe('RecordActivity', () => {
    it('renders without crashing', () => {
        render(
            <BrowserRouter>
                <AuthProvider>
                    <RecordActivity />
                </AuthProvider>
            </BrowserRouter>
        );
    });
});
