import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useSession } from '@/lib/authClient';

/* Front door — routes to the signed-in tabs or the sign-in screen, mirrors
   the web app's app/page.tsx redirect pattern. */
export default function Index() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Redirect href={session ? '/(app)/overview' : '/sign-in'} />;
}
