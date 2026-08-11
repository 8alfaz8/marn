import { useEffect, useState } from 'react';
import { View, Text, Button, ScrollView, StyleSheet } from 'react-native';
import { api } from '@/lib/api';

export default function ProgramScreen() {
  const [program, setProgram] = useState<any>(undefined);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    api.program().then(setProgram).catch(() => setProgram(null));
  };

  useEffect(refresh, []);

  const today = new Date().toISOString().slice(0, 10);
  const doneToday = program?.completions?.includes(today) ?? false;

  const onComplete = async () => {
    setError(null);
    try {
      await api.completeProgram(program.id);
      refresh();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Programme</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      {program === undefined ? (
        <Text>Loading…</Text>
      ) : !program ? (
        <Text>No home programme yet — your coach can prescribe one.</Text>
      ) : (
        <>
          <Text style={styles.subheading}>{program.title}</Text>
          {program.moves.map((m: any) => (
            <View key={m.name} style={styles.card}>
              <Text style={{ fontWeight: '600' }}>{m.name}</Text>
              <Text>
                {m.description} ({m.targetMins} min)
              </Text>
            </View>
          ))}
          <Text>{program.completions.length} completion(s) logged</Text>
          <Button title={doneToday ? 'Done for today' : 'Mark today complete'} onPress={onComplete} disabled={doneToday} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  heading: { fontSize: 22, fontWeight: '600' },
  subheading: { fontSize: 18, fontWeight: '600' },
  card: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 12, gap: 4 },
  error: { color: '#c0392b' },
});
