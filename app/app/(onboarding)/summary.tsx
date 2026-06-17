// app/(onboarding)/summary.tsx
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY } from '@/theme';
import { useAuthStore } from '@/store/auth.store';
import { getPatientById, getFamilyByPatientId, savePatientProfile } from '@/services/auth.service';

export default function SummaryScreen() {
  const params = useLocalSearchParams<{ profileData?: string }>();
  const { patientId, phoneNumber, setSessionState } = useAuthStore();
  
  const [userName, setUserName] = useState('Indresh');
  const [userEmail, setUserEmail] = useState('indresh@example.com');
  const [familyDetails, setFamilyDetails] = useState<{ name: string; code: string } | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  let profile = {
    full_name: 'Indresh',
    age: 20,
    gender: 'Male',
    blood_group: 'O+',
    height: '175cm',
    weight: '72kg',
    allergies: 'Penicillin',
    current_medication: 'None',
    chronic_diseases: 'Migraine, Anxiety',
    family_history: 'Father - Hypertension, Mother - Diabetes',
    smoking: 'Non-smoker',
    alcohol: 'Never',
    emergency_contact: '+91 9876543210',
    surgeries: 'None',
    vaccinations: 'COVID-19, Tetanus',
  };

  if (params.profileData) {
    try {
      profile = { ...profile, ...JSON.parse(params.profileData) };
    } catch (e) {
      console.warn('Error parsing profileData in onboarding summary', e);
    }
  }

  useEffect(() => {
    const loadProfileData = async () => {
      if (!patientId) {
        setIsLoadingData(false);
        return;
      }
      try {
        const patient = await getPatientById(patientId);
        if (patient) {
          setUserName(patient.name);
          if (patient.email) setUserEmail(patient.email);
        }
        
        const family = await getFamilyByPatientId(patientId);
        if (family) {
          setFamilyDetails({
            name: family.family_name || 'My Family Group',
            code: family.join_code || '',
          });
        }
      } catch (err) {
        console.warn('Failed to load profile details in summary', err);
      } finally {
        setIsLoadingData(false);
      }
    };
    loadProfileData();
  }, [patientId]);

  const handleLaunch = async () => {
    setIsSaving(true);
    try {
      await savePatientProfile({
        patientId: patientId || 'skip-user-123',
        name: userName || profile.full_name,
        age: parseInt(String(profile.age), 10) || 20,
        gender: profile.gender || 'Male',
        phone: phoneNumber || '+91 9324474812',
      });

      setSessionState({
        hasProfile: true,
      });

      router.replace('/(tabs)/home');
    } catch (err: any) {
      console.error('Error launching app from summary', err);
      Alert.alert('Configuration Error', err.message || 'Failed to save health baseline. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingData) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0474FC" />
        <Text style={[styles.successDesc, { marginTop: 12 }]}>Syncing health record...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#07111f" />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Verify Profile Configuration</Text>
        </View>

        <View style={styles.successCard}>
          <View style={styles.successIcon}>
            <Ionicons name="shield-checkmark" size={44} color="#10B981" />
          </View>
          <Text style={styles.successTitle}>Medical Profile Verified</Text>
          <Text style={styles.successDesc}>
            Your health baseline is now ready to be securely synchronized with your clinical record.
          </Text>
        </View>

        {/* Personal & Family Information */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Patient Name</Text>
              <Text style={styles.val}>{userName || 'Indresh'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Email Address</Text>
              <Text style={styles.val}>{userEmail || 'indresh@example.com'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Phone Number</Text>
              <Text style={styles.val}>{phoneNumber || '+91 9324474812'}</Text>
            </View>
            {familyDetails && (
              <View style={styles.gridItem}>
                <Text style={styles.label}>Family Group</Text>
                <Text style={styles.val}>{familyDetails.name} (Code: {familyDetails.code})</Text>
              </View>
            )}
          </View>
        </View>

        {/* Baseline Metrics */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Vitals Baseline</Text>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Age / Gender</Text>
              <Text style={styles.val}>{profile.age} yrs • {profile.gender}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Height / Weight</Text>
              <Text style={styles.val}>{profile.height} / {profile.weight}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Blood Group</Text>
              <Text style={styles.val}>{profile.blood_group}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Allergies</Text>
              <Text style={styles.val}>{profile.allergies}</Text>
            </View>
          </View>
        </View>

        {/* Clinical Background */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Clinical History</Text>

          <View style={styles.list}>
            <View style={styles.listItem}>
              <Ionicons name="medkit-outline" size={18} color="#3B82F6" />
              <View style={styles.listItemTextContainer}>
                <Text style={styles.listLabel}>Active Medications</Text>
                <Text style={styles.listVal}>{profile.current_medication}</Text>
              </View>
            </View>

            <View style={styles.listItem}>
              <Ionicons name="pulse" size={18} color="#8B5CF6" />
              <View style={styles.listItemTextContainer}>
                <Text style={styles.listLabel}>Chronic Conditions</Text>
                <Text style={styles.listVal}>{profile.chronic_diseases}</Text>
              </View>
            </View>

            <View style={styles.listItem}>
              <Ionicons name="bandage-outline" size={18} color="#EF4444" />
              <View style={styles.listItemTextContainer}>
                <Text style={styles.listLabel}>Past Surgeries</Text>
                <Text style={styles.listVal}>{profile.surgeries}</Text>
              </View>
            </View>

            <View style={styles.listItem}>
              <Ionicons name="shield-outline" size={18} color="#10B981" />
              <View style={styles.listItemTextContainer}>
                <Text style={styles.listLabel}>Vaccination Status</Text>
                <Text style={styles.listVal}>{profile.vaccinations}</Text>
              </View>
            </View>

            <View style={styles.listItem}>
              <Ionicons name="people-outline" size={18} color="#8B5CF6" />
              <View style={styles.listItemTextContainer}>
                <Text style={styles.listLabel}>Family History</Text>
                <Text style={styles.listVal}>{profile.family_history}</Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.button, isSaving && styles.buttonDisabled]} 
          onPress={handleLaunch} 
          disabled={isSaving}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#0474FC', '#0284C7']}
            style={styles.buttonGradient}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.buttonText}>Launch Swasthya AI</Text>
                <Ionicons name="rocket-outline" size={20} color="#FFFFFF" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Bottom padding spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07111f',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  successCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  successIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    marginBottom: 6,
  },
  successDesc: {
    color: '#8AA0BC',
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  summarySection: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  sectionTitle: {
    color: '#0474FC',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
    columnGap: 16,
  },
  gridItem: {
    width: '46%',
  },
  label: {
    color: '#8AA0BC',
    fontFamily: 'Poppins_500Medium',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  val: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    marginTop: 2,
  },
  list: {
    gap: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listItemTextContainer: {
    flex: 1,
  },
  listLabel: {
    color: '#8AA0BC',
    fontFamily: 'Poppins_500Medium',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  listVal: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    marginTop: 1,
  },
  button: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
  },
  bottomSpacer: {
    height: 40,
  },
});