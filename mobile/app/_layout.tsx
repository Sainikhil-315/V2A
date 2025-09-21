import { WebView } from 'react-native-webview';
import { View, StyleSheet } from 'react-native';
import { useEffect } from 'react';

export default function Layout() {
  useEffect(() => {
  const checkBackendHealth = async () => {
    try {
      const response = await fetch('http://192.168.0.187:5000/api/health');
      const data = await response.json();
      console.log('✅ Backend Health:', data);
    } catch (error) {
      if (error instanceof Error) {
        console.error('❌ Backend Health Check Failed:', error.message);
      } else {
        console.error('❌ Unknown error during health check:', error);
      }
    }
  };

  checkBackendHealth();
}, []);


  return (
    <View style={styles.container}>
      <WebView source={{ uri: 'http://192.168.0.187:3000' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
