import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Button, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { signOut } from '@/lib/authClient';

export default function OverviewScreen() {
  const router = useRouter();
  const [data, setData] = useState<any>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .portal()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const onSignOut = async () => {
    await signOut();
    router.replace('/sign-in');
  };

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
        <Button title="Sign out" onPress={onSignOut} />
      </View>
    );
  }
  if (data === undefined) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>{data.member.name}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your scores</Text>
        {!data.assessedAt ? (
          <Text>Your scores start after your first assessment with a coach.</Text>
        ) : (
          <View style={styles.scoresRow}>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreValue}>{data.scores.flexibility}</Text>
              <Text>Flexibility</Text>
            </View>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreValue}>{data.scores.mobility}</Text>
              <Text>Mobility</Text>
            </View>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreValue}>{data.scores.recovery}</Text>
              <Text>Recovery</Text>
            </View>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreValue}>{data.scores.consistency}</Text>
              <Text>Consistency</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Session history</Text>
        {data.sessions.length === 0 ? (
          <Text>No sessions yet.</Text>
        ) : (
          data.sessions.map((s: any) => (
            <View key={s.id} style={styles.sessionRow}>
              <Text>
                {s.completedAt} · {s.mins} min
              </Text>
              <Text>{s.memberSummary}</Text>
            </View>
          ))
        )}
      </View>

      <Button title="Sign out" onPress={onSignOut} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  heading: { fontSize: 24, fontWeight: '600' },
  card: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 16, gap: 8 },
  cardTitle: { fontSize: 12, textTransform: 'uppercase', color: '#666' },
  scoresRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  scoreBox: { alignItems: 'center', minWidth: 70 },
  scoreValue: { fontSize: 28, fontWeight: '700' },
  sessionRow: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#eee' },
  error: { color: '#c0392b' },
});
