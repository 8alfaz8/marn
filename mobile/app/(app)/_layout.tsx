import { Tabs } from 'expo-router';

export default function AppLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="overview" options={{ title: 'Overview' }} />
      <Tabs.Screen name="book" options={{ title: 'Book' }} />
      <Tabs.Screen name="bookings" options={{ title: 'My bookings' }} />
      <Tabs.Screen name="program" options={{ title: 'Programme' }} />
      <Tabs.Screen name="checkin" options={{ title: 'Check-in' }} />
    </Tabs>
  );
}
