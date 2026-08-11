import { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, Button, ScrollView, StyleSheet } from 'react-native';
import { api } from '@/lib/api';

const SERVICES = [
  { id: 'st30', name: 'Assisted Stretch', mins: 30, aed: 100 },
  { id: 'st60', name: 'Assisted Stretch — Long', mins: 60, aed: 190 },
  { id: 'cb30', name: 'Compression Recovery', mins: 30, aed: 90 },
  { id: 'ox20', name: 'Oxygen Reset', mins: 20, aed: 80 },
];

export default function BookScreen() {
  const [session, setSession] = useState<{ parqCleared: boolean; referredToDoctor: boolean } | undefined>(undefined);
  const [coaches, setCoaches] = useState<{ id: string; name: string }[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [coachId, setCoachId] = useState('');
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [time, setTime] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.session().then(setSession).catch(() => setSession({ parqCleared: false, referredToDoctor: false }));
  }, []);

  useEffect(() => {
    if (session?.parqCleared) api.coaches().then(setCoaches).catch(() => {});
  }, [session]);

  useEffect(() => {
    if (coachId && serviceId && date) {
      api
        .availability(coachId, date, serviceId)
        .then(setSlots)
        .catch(() => setSlots([]));
    } else {
      setSlots([]);
    }
  }, [coachId, serviceId, date]);

  const onBook = async () => {
    setError(null);
    setMessage(null);
    try {
      await api.createBooking({ coachId, serviceId, date, time });
      setMessage('Requested — a studio manager will confirm it shortly.');
      setTime('');
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (session === undefined) {
    return (
      <View style={styles.container}>
        <Text>Loading…</Text>
      </View>
    );
  }

  if (!session.parqCleared) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>{session.referredToDoctor ? 'Referred to a doctor' : 'Awaiting readiness screening'}</Text>
        <Text>
          {session.referredToDoctor
            ? 'Your last screening flagged something to check with a doctor first. Speak with a coach before your next visit.'
            : 'A coach needs to complete a short readiness screening with you before you can book. Visit the studio to get started.'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Book a session</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      {message && <Text style={styles.success}>{message}</Text>}

      <Text style={styles.label}>Service</Text>
      <View style={styles.chipRow}>
        {SERVICES.map((s) => (
          <Pressable key={s.id} onPress={() => setServiceId(s.id)} style={[styles.chip, serviceId === s.id && styles.chipSelected]}>
            <Text style={serviceId === s.id ? styles.chipTextSelected : undefined}>{s.name}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Coach</Text>
      <View style={styles.chipRow}>
        {coaches.map((c) => (
          <Pressable key={c.id} onPress={() => setCoachId(c.id)} style={[styles.chip, coachId === c.id && styles.chipSelected]}>
            <Text style={coachId === c.id ? styles.chipTextSelected : undefined}>{c.name}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
      <TextInput style={styles.input} placeholder="2026-08-15" value={date} onChangeText={setDate} />

      <Text style={styles.label}>Time</Text>
      <View style={styles.chipRow}>
        {slots.map((s) => (
          <Pressable
            key={s.time}
            disabled={!s.available}
            onPress={() => setTime(s.time)}
            style={[styles.chip, time === s.time && styles.chipSelected, !s.available && styles.chipDisabled]}
          >
            <Text style={time === s.time ? styles.chipTextSelected : undefined}>{s.time}</Text>
          </Pressable>
        ))}
      </View>

      <Button title="Request booking" onPress={onBook} disabled={!coachId || !serviceId || !date || !time} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  heading: { fontSize: 22, fontWeight: '600', marginBottom: 8 },
  label: { fontSize: 12, textTransform: 'uppercase', color: '#666', marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#999', borderRadius: 8, padding: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#999', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12 },
  chipSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipTextSelected: { color: '#fff' },
  chipDisabled: { opacity: 0.35 },
  error: { color: '#c0392b' },
  success: { color: '#1e7e34' },
});
