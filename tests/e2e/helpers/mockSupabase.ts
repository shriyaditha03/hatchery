import { Page } from '@playwright/test';

// The Supabase project ref extracted from VITE_SUPABASE_URL
// URL: https://uzecdpdwrhjcanszfcei.supabase.co → key: sb-uzecdpdwrhjcanszfcei-auth-token
export const SUPABASE_STORAGE_KEY = 'sb-uzecdpdwrhjcanszfcei-auth-token';

/**
 * Returns a script string that injects a valid-format fake JWT session into localStorage.
 * Runs in the browser context via page.addInitScript before Supabase initializes.
 * Supabase auth-js validates JWT format and expiry but NOT signature client-side.
 */
export function getInjectSessionScript(storageKey: string): string {
    return `
        (function() {
            try {
                const toBase64url = (str) => btoa(str).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=/g, '');
                const objToBase64url = (obj) => toBase64url(JSON.stringify(obj));
                
                const header = objToBase64url({ alg: 'HS256', typ: 'JWT' });
                const exp = Math.floor(Date.now() / 1000) + (365 * 24 * 3600);
                const iat = Math.floor(Date.now() / 1000) - 100;
                const payload = objToBase64url({
                    sub: 'fake-user-id',
                    email: 'test_supervisor@example.com',
                    role: 'authenticated',
                    aud: 'authenticated',
                    iat, exp
                });
                const sig = toBase64url('fakesig');
                const fakeJWT = header + '.' + payload + '.' + sig;

                const session = {
                    access_token: fakeJWT,
                    refresh_token: 'fake-refresh-' + Date.now(),
                    expires_at: exp,
                    expires_in: 365 * 24 * 3600,
                    token_type: 'bearer',
                    user: {
                        id: 'fake-user-id', aud: 'authenticated',
                        email: 'test_supervisor@example.com',
                        role: 'authenticated',
                        user_metadata: { role: 'supervisor' },
                        app_metadata: { provider: 'email' }
                    }
                };

                localStorage.setItem('${storageKey}', JSON.stringify(session));
                localStorage.setItem('supabase.auth.token', JSON.stringify({ currentSession: session, expiresAt: exp }));
            } catch(e) {
                console.error('Failed to inject mock session:', e);
            }
        })();
    `;
}

/**
 * Sets up all necessary Supabase mocks for a logged-in supervisor user.
 * @param tanks - Array of tank objects ({ id, name }) to populate the farm_access mock
 */
export async function setupSupervisorMocks(
    page: Page,
    tanks: Array<{ id: string; name: string }> = [{ id: 't1', name: 'Tank 1' }, { id: 't2', name: 'Tank 2' }]
) {
    // 1. Inject valid fake JWT BEFORE the app or Supabase initialize
    await page.addInitScript(getInjectSessionScript(SUPABASE_STORAGE_KEY));

    // 2. Mock auth network endpoints (catch token refresh calls etc.)
    await page.route('**/auth/v1/**', (route) => {
        route.fulfill({
            status: 200, contentType: 'application/json',
            body: JSON.stringify({
                access_token: 'network-fake-token', refresh_token: 'network-fake-refresh',
                expires_in: 86400, token_type: 'bearer',
                user: { id: 'fake-user-id', aud: 'authenticated', email: 'test_supervisor@example.com', user_metadata: { role: 'supervisor' } }
            })
        });
    });

    // 3. Mock profiles table
    const profile = {
        id: 'fake-user-id', auth_user_id: 'fake-user-id', role: 'supervisor',
        hatchery_id: 'fake-hatchery', full_name: 'Test Supervisor',
        username: 'test_supervisor', email: 'test_supervisor@example.com',
        phone: '', current_session_key: null
    };
    await page.route('**/rest/v1/profiles*', (route) => {
        const isSingle = route.request().headers()['accept']?.includes('vnd.pgrst.object');
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(isSingle ? profile : [profile]) });
    });

    // 4. Mock farm_access with the structure fetchTanks() expects from nested select
    await page.route('**/rest/v1/farm_access*', (route) => {
        route.fulfill({
            status: 200, contentType: 'application/json',
            body: JSON.stringify([{
                farm_id: 'farm1', section_id: 'sec1', tank_id: null,
                farms: { name: 'Test Farm', sections: [{ id: 'sec1', name: 'Section 1', tanks }] },
                sections: { name: 'Section 1' }
            }])
        });
    });

    // 5. Mock hatcheries
    await page.route('**/rest/v1/hatcheries*', (route) => {
        const h = { id: 'fake-hatchery', name: 'Test Hatchery', location: 'Nellore' };
        const isSingle = route.request().headers()['accept']?.includes('vnd.pgrst.object');
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(isSingle ? h : [h]) });
    });

    // 6. Mock RPC: get stocked tank populations
    await page.route('**/rpc/get_active_tank_populations*', (route) => {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tanks.map(t => ({ tank_id: t.id, current_population: 1000 }))) });
    });

    // 7. Catch-all for other RPC calls
    await page.route('**/rpc/**', (route) => {
        route.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
    });

    // 8. Mock activity data
    await page.route('**/rest/v1/activity_charts*', (route, request) => {
        if (request.method() === 'POST') {
            route.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
        } else {
            route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
        }
    });
    await page.route('**/rest/v1/activity_logs*', (route) => {
        route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
}
