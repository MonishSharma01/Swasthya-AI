// app/index.tsx
import { Loader } from '@/components/ui/Loader';
import { useAuthStore } from '@/store/auth.store';
import { Redirect, useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function Index() {
  const router = useRouter();
  const { isLoggedIn, hasProfile, hasFamilyGroup, isHydrated, setSessionState } = useAuthStore();

  const handleSkip = () => {
    setSessionState({
      userId: 'skip-user-123',
      patientId: 'skip-patient-123',
      phoneNumber: '+91 9324474812',
      isLoggedIn: true,
      hasProfile: true,
      hasFamilyGroup: true,
      isHydrated: true,
      hasShownIntro: true,
    });
    router.replace('/(tabs)/home');
  };

  if (!isHydrated) {
    return <Loader text="Hydrating session..." />;
  }

  return (
    <View style={styles.container}>
      {(!isLoggedIn || !hasProfile || !hasFamilyGroup) && (
        <View style={styles.skipContainer}>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {!isLoggedIn && <Redirect href="/(auth)/welcome" />}
      {isLoggedIn && !hasFamilyGroup && <Redirect href="/(onboarding)/family-setup" />}
      {isLoggedIn && hasFamilyGroup && !hasProfile && <Redirect href="/(onboarding)/chat" />}
      {isLoggedIn && hasFamilyGroup && hasProfile && <Redirect href="/(tabs)/home" />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 999,
  },
  skipButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#10B981',
    borderRadius: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});