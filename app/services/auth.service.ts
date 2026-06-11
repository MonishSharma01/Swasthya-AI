// app/services/auth.service.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export const normalizePhone = (value: string) => value.replace(/\D/g, '').slice(-10);

const OAUTH_CALLBACK_PATH = 'auth/callback';
const OTP_STORAGE_KEY = 'pending_otp';
const PROFILE_PREFIX = 'user_profile_';
const FAMILY_PREFIX = 'family_';
const FAMILY_MEMBERS_PREFIX = 'family_members_';
const CURRENT_USER_ID_KEY = 'current_user_id';
const CURRENT_USER_PHONE_KEY = 'current_user_phone';

export interface PendingOTP {
  phone: string;
  otp: string;
  timestamp: number;
  expiresIn: number; // milliseconds
}

export interface PatientRecord {
  id: string;
  name: string;
  age: number | null;
  gender: string | null;
  phone: string | null;
  family_id: string | null;
  created_at?: string;
}

export interface FamilyRecord {
  id: string;
  family_name: string | null;
  qr_code: string | null;
  created_by: string | null;
  created_at: string;
  join_code: string | null;
}

export const getRedirectUrl = () => Linking.createURL(OAUTH_CALLBACK_PATH);

// OTP Functions
export const generateRandomOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const storeOTPLocally = async (phone: string, otp: string): Promise<void> => {
  const normalized = normalizePhone(phone);
  const pendingOtp: PendingOTP = {
    phone: normalized,
    otp,
    timestamp: Date.now(),
    expiresIn: 10 * 60 * 1000, // 10 minutes
  };
  console.log('Storing OTP:', { normalized, otp, timestamp: new Date(pendingOtp.timestamp).toISOString() });
  await AsyncStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(pendingOtp));
  console.log('OTP stored successfully');
};

export const getStoredOTP = async (phone: string): Promise<string | null> => {
  try {
    const normalized = normalizePhone(phone);
    const stored = await AsyncStorage.getItem(OTP_STORAGE_KEY);
    console.log('Getting OTP for phone:', normalized, 'Raw stored:', stored);
    
    if (!stored) {
      console.log('No OTP found in storage');
      return null;
    }

    const pendingOtp: PendingOTP = JSON.parse(stored);
    const isExpired = Date.now() - pendingOtp.timestamp > pendingOtp.expiresIn;
    const isPhoneMatch = pendingOtp.phone === normalized;
    
    if (isExpired || !isPhoneMatch) {
      await AsyncStorage.removeItem(OTP_STORAGE_KEY);
      return null;
    }

    return pendingOtp.otp;
  } catch (error) {
    console.error('Error in getStoredOTP:', error);
    return null;
  }
};

export const clearStoredOTP = async (): Promise<void> => {
  await AsyncStorage.removeItem(OTP_STORAGE_KEY);
};

// Mock Session Functions
export const signInWithGoogle = async () => {
  return { user: { id: 'mock-google-user', email: 'user@example.com' } };
};

export const getCurrentSession = async () => {
  const phone = await AsyncStorage.getItem(CURRENT_USER_PHONE_KEY);
  if (!phone) return null;
  const userId = await AsyncStorage.getItem(CURRENT_USER_ID_KEY) || `user_${phone}`;
  return {
    user: {
      id: userId,
      phone: phone,
      email: `${phone}@example.com`,
      is_anonymous: false,
      user_metadata: {
        patient_id: userId,
        phone: phone,
      }
    }
  };
};

export const signOut = async () => {
  await AsyncStorage.removeItem(CURRENT_USER_ID_KEY);
  await AsyncStorage.removeItem(CURRENT_USER_PHONE_KEY);
};

export const createPhoneAuthUser = async (phone: string, name?: string): Promise<PatientRecord | null> => {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return null;

  console.log('=== Offline: Creating Phone Auth User ===');
  await AsyncStorage.setItem(CURRENT_USER_PHONE_KEY, normalizedPhone);
  
  // Check if user already exists
  const existingUser = await getPatientByPhone(normalizedPhone);
  if (existingUser) {
    await AsyncStorage.setItem(CURRENT_USER_ID_KEY, existingUser.id);
    return existingUser;
  }

  const userId = `user_${normalizedPhone}`;
  await AsyncStorage.setItem(CURRENT_USER_ID_KEY, userId);

  const newUser: PatientRecord = {
    id: userId,
    name: name?.trim() || 'User',
    phone: normalizedPhone,
    age: null,
    gender: null,
    family_id: null,
    created_at: new Date().toISOString(),
  };

  await AsyncStorage.setItem(`${PROFILE_PREFIX}${userId}`, JSON.stringify(newUser));
  await AsyncStorage.setItem(`${PROFILE_PREFIX}${normalizedPhone}`, JSON.stringify(newUser));
  return newUser;
};

export const ensureUserRowForSession = async (input: {
  userId: string;
  phone: string;
  name?: string;
}) => {
  const normalizedPhone = normalizePhone(input.phone);
  if (!normalizedPhone) return null;

  let profileStr = await AsyncStorage.getItem(`${PROFILE_PREFIX}${input.userId}`);
  if (profileStr) return JSON.parse(profileStr) as PatientRecord;

  profileStr = await AsyncStorage.getItem(`${PROFILE_PREFIX}${normalizedPhone}`);
  if (profileStr) return JSON.parse(profileStr) as PatientRecord;

  const newUser: PatientRecord = {
    id: input.userId,
    name: input.name?.trim() || 'User',
    phone: normalizedPhone,
    age: null,
    gender: null,
    family_id: null,
    created_at: new Date().toISOString(),
  };

  await AsyncStorage.setItem(`${PROFILE_PREFIX}${input.userId}`, JSON.stringify(newUser));
  await AsyncStorage.setItem(`${PROFILE_PREFIX}${normalizedPhone}`, JSON.stringify(newUser));
  return newUser;
};

export const getPatientByPhone = async (phone: string) => {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return null;

  const profileStr = await AsyncStorage.getItem(`${PROFILE_PREFIX}${normalizedPhone}`);
  if (!profileStr) return null;
  return JSON.parse(profileStr) as PatientRecord;
};

export const getPatientById = async (id: string) => {
  const profileStr = await AsyncStorage.getItem(`${PROFILE_PREFIX}${id}`);
  if (!profileStr) return null;
  return JSON.parse(profileStr) as PatientRecord;
};

export const getCurrentPatient = async (): Promise<PatientRecord | null> => {
  const currentId = await AsyncStorage.getItem(CURRENT_USER_ID_KEY);
  if (!currentId) {
    // Return a default mock profile if nothing is logged in yet
    return {
      id: 'demo-patient-id',
      name: 'Rahul Kumar',
      age: 24,
      gender: 'Male',
      phone: '9324474812',
      family_id: '123456',
      created_at: new Date().toISOString()
    };
  }
  return getPatientById(currentId);
};

export const savePatientProfile = async (input: {
  patientId?: string | null;
  name: string;
  age: number;
  gender: string;
  phone: string;
  familyId?: string | null;
}) => {
  console.log('=== Offline: Saving Patient Profile ===');
  const normalizedPhone = normalizePhone(input.phone);
  const resolvedId = input.patientId || `user_${normalizedPhone}`;

  // Read existing profile to keep other data intact
  const existingStr = await AsyncStorage.getItem(`${PROFILE_PREFIX}${resolvedId}`);
  const existing = existingStr ? JSON.parse(existingStr) : {};

  const payload: PatientRecord = {
    ...existing,
    id: resolvedId,
    name: input.name.trim(),
    age: input.age,
    gender: input.gender,
    phone: normalizedPhone,
    family_id: input.familyId || existing.family_id || null,
  };

  await AsyncStorage.setItem(`${PROFILE_PREFIX}${resolvedId}`, JSON.stringify(payload));
  await AsyncStorage.setItem(`${PROFILE_PREFIX}${normalizedPhone}`, JSON.stringify(payload));
  await AsyncStorage.setItem(CURRENT_USER_ID_KEY, resolvedId);

  return payload;
};

// Family Functions using AsyncStorage
export const createFamilyForPatient = async (familyName: string, patient: PatientRecord) => {
  const joinCode = Math.floor(100000 + Math.random() * 900000).toString();
  const familyId = `family_${joinCode}`;
  
  const family: FamilyRecord = {
    id: familyId,
    family_name: familyName.trim(),
    qr_code: `SWASTHYA_FAMILY:${joinCode}`,
    created_by: patient.id,
    created_at: new Date().toISOString(),
    join_code: joinCode,
  };

  await AsyncStorage.setItem(`${FAMILY_PREFIX}${joinCode}`, JSON.stringify(family));
  await AsyncStorage.setItem(`${FAMILY_PREFIX}${familyId}`, JSON.stringify(family));

  // Update patient profile locally
  const updatedPatient = { ...patient, family_id: familyId };
  await AsyncStorage.setItem(`${PROFILE_PREFIX}${patient.id}`, JSON.stringify(updatedPatient));
  if (patient.phone) {
    await AsyncStorage.setItem(`${PROFILE_PREFIX}${patient.phone}`, JSON.stringify(updatedPatient));
  }

  // Set member list
  const memberList = [
    {
      id: `member_${patient.id}`,
      family_id: familyId,
      patient_id: patient.id,
      role: 'admin',
      patient: updatedPatient
    }
  ];
  await AsyncStorage.setItem(`${FAMILY_MEMBERS_PREFIX}${familyId}`, JSON.stringify(memberList));

  return { family, joinCode };
};

export const joinFamilyForPatient = async (joinCode: string, patient: PatientRecord) => {
  const normalizedCode = joinCode.trim();
  const familyStr = await AsyncStorage.getItem(`${FAMILY_PREFIX}${normalizedCode}`);
  
  if (!familyStr) {
    // If not found, create a mock family for demonstration to let the join succeed
    const mockFamilyId = `family_${normalizedCode}`;
    const mockFamily: FamilyRecord = {
      id: mockFamilyId,
      family_name: 'Sharma Family',
      qr_code: `SWASTHYA_FAMILY:${normalizedCode}`,
      created_by: 'external-user',
      created_at: new Date().toISOString(),
      join_code: normalizedCode,
    };
    await AsyncStorage.setItem(`${FAMILY_PREFIX}${normalizedCode}`, JSON.stringify(mockFamily));
    await AsyncStorage.setItem(`${FAMILY_PREFIX}${mockFamilyId}`, JSON.stringify(mockFamily));
  }

  const freshFamilyStr = await AsyncStorage.getItem(`${FAMILY_PREFIX}${normalizedCode}`);
  const family = JSON.parse(freshFamilyStr!) as FamilyRecord;
  const familyId = family.id;

  // Update patient locally
  const updatedPatient = { ...patient, family_id: familyId };
  await AsyncStorage.setItem(`${PROFILE_PREFIX}${patient.id}`, JSON.stringify(updatedPatient));
  if (patient.phone) {
    await AsyncStorage.setItem(`${PROFILE_PREFIX}${patient.phone}`, JSON.stringify(updatedPatient));
  }

  // Add to member list
  const memberListStr = await AsyncStorage.getItem(`${FAMILY_MEMBERS_PREFIX}${familyId}`);
  const memberList = memberListStr ? JSON.parse(memberListStr) : [];
  
  // Check if already in list
  if (!memberList.some((m: any) => m.patient_id === patient.id)) {
    memberList.push({
      id: `member_${patient.id}`,
      family_id: familyId,
      patient_id: patient.id,
      role: 'member',
      patient: updatedPatient
    });
    await AsyncStorage.setItem(`${FAMILY_MEMBERS_PREFIX}${familyId}`, JSON.stringify(memberList));
  }

  return family;
};

export const getFamilyByPatientId = async (patientId: string) => {
  const patient = await getPatientById(patientId);
  if (!patient || !patient.family_id) return null;

  const familyStr = await AsyncStorage.getItem(`${FAMILY_PREFIX}${patient.family_id}`);
  if (!familyStr) return null;
  return JSON.parse(familyStr) as FamilyRecord;
};

export const getFamilyMembers = async (familyId: string) => {
  const memberListStr = await AsyncStorage.getItem(`${FAMILY_MEMBERS_PREFIX}${familyId}`);
  if (!memberListStr) {
    // Return mock family members for visual presentation
    return [
      {
        id: 'member-1',
        family_id: familyId,
        patient_id: 'patient-1',
        role: 'admin',
        patient: {
          id: 'patient-1',
          name: 'Rahul Kumar',
          age: 24,
          gender: 'Male',
          phone: '9324474812',
          family_id: familyId
        }
      },
      {
        id: 'member-2',
        family_id: familyId,
        patient_id: 'patient-2',
        role: 'member',
        patient: {
          id: 'patient-2',
          name: 'Sunita Kumar',
          age: 48,
          gender: 'Female',
          phone: '9876543210',
          family_id: familyId
        }
      }
    ];
  }
  return JSON.parse(memberListStr);
};
