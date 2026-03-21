import { Pressable, StyleSheet, View, Text, ViewStyle, TextStyle, GestureResponderEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

interface AccessibleButtonProps {
  onPress: (event?: GestureResponderEvent) => void | Promise<void>;
  children: ReactNode;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: {
    backgroundColor: '#1E40AF',
  },
  secondary: {
    backgroundColor: '#4CAF50',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#1E40AF',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: '#F44336',
  },
};

const variantTextStyles: Record<ButtonVariant, TextStyle> = {
  primary: {
    color: '#FFFFFF',
  },
  secondary: {
    color: '#FFFFFF',
  },
  outline: {
    color: '#1E40AF',
  },
  ghost: {
    color: '#1E40AF',
  },
  danger: {
    color: '#FFFFFF',
  },
};

export function AccessibleButton({
  onPress,
  children,
  variant = 'primary',
  disabled = false,
  loading = false,
  accessibilityLabel,
  accessibilityHint,
  style,
  textStyle,
  icon,
  fullWidth = false,
}: AccessibleButtonProps) {
  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const content = (
    <View style={[styles.content, icon && styles.contentWithIcon]}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text
        style={[
          styles.text,
          variantTextStyles[variant],
          disabled && styles.disabledText,
          textStyle,
        ]}
      >
        {children}
      </Text>
    </View>
  );

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || (typeof children === 'string' ? children : undefined)}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading }}
      style={({ pressed }) => [
        styles.button,
        variantStyles[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <Text style={[styles.text, variantTextStyles[variant]]}>Loading...</Text>
      ) : (
        content
      )}
    </Pressable>
  );
}

interface AccessiblePressableProps {
  onPress: (event?: GestureResponderEvent) => void | Promise<void>;
  children: ReactNode;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'link' | 'menuitem';
  style?: ViewStyle;
  stylePressed?: ViewStyle;
}

export function AccessiblePressable({
  onPress,
  children,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  style,
  stylePressed,
}: AccessiblePressableProps) {
  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.pressable,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
        pressed && stylePressed,
      ]}
    >
      {children}
    </Pressable>
  );
}

interface AccessibleCardProps {
  onPress?: () => void | Promise<void>;
  children: ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: ViewStyle;
}

export function AccessibleCard({
  onPress,
  children,
  accessibilityLabel,
  accessibilityHint,
  style,
}: AccessibleCardProps) {
  const handlePress = async () => {
    if (onPress) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  if (onPress) {
    return (
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View
      accessibilityRole="none"
      style={[styles.card, style]}
    >
      {children}
    </View>
  );
}

interface IconButtonProps {
  icon: ReactNode;
  onPress: () => void | Promise<void>;
  variant?: ButtonVariant;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  accessibilityLabel: string;
  accessibilityHint?: string;
}

export function AccessibleIconButton({
  icon,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
}: IconButtonProps) {
  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const sizeStyles = {
    small: { width: 40, height: 40 },
    medium: { width: 48, height: 48 },
    large: { width: 56, height: 56 },
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.iconButton,
        variantStyles[variant],
        sizeStyles[size],
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentWithIcon: {
    gap: 8,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#9E9E9E',
  },
  fullWidth: {
    width: '100%',
  },
  pressable: {
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardPressed: {
    backgroundColor: '#F5F5F5',
    opacity: 0.9,
  },
  iconButton: {
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
