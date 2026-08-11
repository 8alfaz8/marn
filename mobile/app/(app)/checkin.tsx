import { useState } from 'react';
import { View, Text, Pressable, TextInput, Button, ScrollView, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { api } from '@/lib/api';

const REGIONS = ['Lower', 'Core', 'Upper'];

export default function CheckinScreen() {
  const [sleep, setSleep] = useState(6);
  const [pain, setPain] = useState(2);
  const [areas, setAreas] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleArea = (region: string) => {
    setAreas((cur) => (cur.includes(region) ? cur.filter((a) => a !== region) : [...cur, region]));
  };

  const onSubmit = async () => {
    setError(null);
    setMessage(null);
    try {
      await api.checkin({ sleep, pain, areas, note: note.trim() || undefined });
      setMessage('Sent — your coach will see this before you arrive.');
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Before you arrive</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      {message && <Text style={styles.success}>{message}</Text>}

      <Text style={styles.label}>Sleep quality: {sleep}</Text>
      <Slider minimumValue={0} maximumValue={10} step={1} value={sleep} onValueChange={setSleep} />

      <Text style={styles.label}>Current pain: {pain}</Text>
      <Slider minimumValue={0} maximumValue={10} step={1} value={pain} onValueChange={setPain} />

      <Text style={styles.label}>Areas</Text>
      <View style={styles.chipRow}>
        {REGIONS.map((r) => (
          <Pressable key={r} onPress={() => toggleArea(r)} style={[styles.chip, areas.includes(r) && styles.chipSelected]}>
            <Text style={areas.includes(r) ? styles.chipTextSelected : undefined}>{r}</Text>
          </Pressable>
        ))}
      </View>

      <TextInput style={styles.input} placeholder="Note (optional)" value={note} onChangeText={setNote} multiline />
      <Button title="Send check-in" onPress={onSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  heading: { fontSize: 22, fontWeight: '600', marginBottom: 8 },
  label: { fontSize: 14, color: '#333', marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#999', borderRadius: 8, padding: 12, minHeight: 60 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#999', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12 },
  chipSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipTextSelected: { color: '#fff' },
  error: { color: '#c0392b' },
  success: { color: '#1e7e34' },
});
