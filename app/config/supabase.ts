// config/supabase.ts
import { Platform } from 'react-native';

const createMockSupabase = () => {
    const makePromise = (data: any, error: any = null) => {
        const p = Promise.resolve({ data, error });
        const chain = {
            select: () => chain,
            eq: () => chain,
            order: () => chain,
            limit: () => chain,
            single: () => Promise.resolve({ data, error }),
            maybeSingle: () => Promise.resolve({ data, error }),
            insert: (payload: any) => {
                const insertedData = Array.isArray(payload) ? payload[0] : payload;
                return makePromise(insertedData);
            },
            update: (payload: any) => {
                return makePromise(payload);
            },
            then: (onfulfilled: any) => p.then(onfulfilled),
            catch: (onrejected: any) => p.catch(onrejected),
        };
        return chain;
    };

    return {
        auth: {
            getSession: () => Promise.resolve({ data: { session: null }, error: null }),
            signInAnonymously: () => Promise.resolve({ data: { session: null }, error: null }),
            onAuthStateChange: (callback: any) => {
                // Return a mock unsubscriber subscription
                return { data: { subscription: { unsubscribe: () => {} } } };
            },
        },
        from: (table: string) => {
            if (table === 'users') {
                return makePromise({
                    id: 'demo-patient-id',
                    name: 'Rahul Kumar',
                    age: 24,
                    gender: 'Male',
                    phone: '9324474812',
                    family_id: 'family_123456',
                    created_at: new Date().toISOString()
                });
            }
            if (table === 'families') {
                return makePromise({
                    id: 'family_123456',
                    family_name: 'Sharma Family',
                    qr_code: 'SWASTHYA_FAMILY:123456',
                    created_by: 'demo-patient-id',
                    created_at: new Date().toISOString(),
                    join_code: '123456'
                });
            }
            if (table === 'family_groups') {
                return makePromise([
                    {
                        id: 'member-1',
                        family_id: 'family_123456',
                        patient_id: 'patient-1',
                        role: 'admin',
                        patient: {
                            id: 'patient-1',
                            name: 'Rahul Kumar',
                            age: 24,
                            gender: 'Male',
                            phone: '9324474812',
                            family_id: 'family_123456'
                        }
                    }
                ]);
            }
            return makePromise([]);
        }
    };
};

export const SUPABASE_URL = 'https://placeholder.supabase.co';
export const SUPABASE_ANON_KEY = 'placeholder-anon-key';

export const supabase = createMockSupabase() as any;
export default supabase;
