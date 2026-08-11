import { useEffect, useState } from 'react';
import { View, Text, Button, ScrollView, StyleSheet } from 'react-native';
import { api } from '@/lib/api';

export default function BookingsScreen() {
  const [bookings, setBookings] = useState<any[] | undefined>(undefined);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = () => {
    api.bookings().then(setBookings).catch(() => setBookings([]));
  };

  useEffect(refresh, []);

  const onCancel = async (id: string) => {
    setMessage(null);
    try {
      const { refunded } = await api.cancelBooking(id);
      setMessage(refunded ? 'Cancelled — credit refunded.' : 'Cancelled — credit not refunded (inside 24h).');
      refresh();
    } catch (e: any) {
      setMessage(e.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>My bookings</Text>
      {message && <Text style={styles.message}>{message}</Text>}
      {bookings === undefined ? (
        <Text>Loading…</Text>
      ) : bookings.length === 0 ? (
        <Text>No bookings yet.</Text>
      ) : (
        bookings.map((b) => (
          <View key={b.id} style={styles.card}>
            <Text>
              {b.date} · {b.time} · {b.serviceId}
            </Text>
            <Text style={styles.status}>{b.status}</Text>
            {(b.status === 'requested' || b.status === 'confirmed') && <Button title="Cancel" onPress={() => onCancel(b.id)} />}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  heading: { fontSize: 22, fontWeight: '600' },
  card: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 12, gap: 6 },
  status: { color: '#666' },
  message: { color: '#1e7e34' },
});
