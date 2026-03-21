import { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Text, Button, ActivityIndicator } from 'react-native-paper';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose?: () => void;
  scanOnly?: boolean;
}

export function QRScanner({ onScan, onClose, scanOnly = false }: QRScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const scanAnim = new Animated.Value(0);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [scanAnim]);

  useEffect(() => {
    if (scanned) {
      setIsProcessing(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        setIsProcessing(false);
      }, 500);
    }
  }, [scanned]);

  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    if (scanned || isProcessing) return;
    
    setScanned(true);
    onScan(result.data);
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#1E40AF" />
        <Text style={styles.message}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Camera Permission Required</Text>
        <Text style={styles.permissionText}>
          We need camera access to scan QR codes for ticket lookup and patient check-in.
        </Text>
        <Button
          mode="contained"
          onPress={requestPermission}
          style={styles.permissionButton}
        >
          Grant Permission
        </Button>
        {onClose && (
          <Button
            mode="outlined"
            onPress={onClose}
            style={styles.closeButton}
          >
            Cancel
          </Button>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      >
        <View style={styles.overlay}>
          <View style={styles.topOverlay} />
          <View style={styles.middleRow}>
            <View style={styles.sideOverlay} />
            <View style={styles.scanArea}>
              <Animated.View
                style={[
                  styles.scanLine,
                  {
                    transform: [
                      {
                        translateY: scanAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 200],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <View style={styles.cornerTL} />
              <View style={styles.cornerTR} />
              <View style={styles.cornerBL} />
              <View style={styles.cornerBR} />
            </View>
            <View style={styles.sideOverlay} />
          </View>
          <View style={styles.bottomOverlay}>
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.hintText}>
                Position the QR code within the frame
              </Text>
            )}
            {scanned && (
              <Button
                mode="contained"
                onPress={() => setScanned(false)}
                style={styles.rescanButton}
              >
                Scan Again
              </Button>
            )}
          </View>
        </View>
      </CameraView>

      {onClose && (
        <View style={styles.closeContainer}>
          <Button
            mode="contained"
            onPress={onClose}
            style={styles.cancelButton}
          >
            Cancel
          </Button>
        </View>
      )}
    </View>
  );
}

const { width, height } = Dimensions.get('window');
const SCAN_AREA_SIZE = width * 0.7;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  topOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  middleRow: {
    flexDirection: 'row',
    height: SCAN_AREA_SIZE,
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    position: 'relative',
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#4CAF50',
    opacity: 0.8,
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#4CAF50',
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#4CAF50',
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#4CAF50',
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#4CAF50',
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  hintText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  rescanButton: {
    backgroundColor: '#4CAF50',
    marginTop: 8,
  },
  message: {
    marginTop: 16,
    color: '#FFFFFF',
    fontSize: 16,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f5f5f5',
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#1E40AF',
    minWidth: 200,
  },
  closeButton: {
    marginTop: 16,
  },
  closeContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F44336',
    minWidth: 150,
  },
});
