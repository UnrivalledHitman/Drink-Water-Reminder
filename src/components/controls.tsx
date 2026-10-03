import { type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Scrollable page that clears the status bar and the tab bar. */
export function Screen({ title, children }: { title: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[
        styles.screen,
        {
          paddingTop: Platform.OS === 'web' ? Spacing.six + Spacing.four : insets.top + Spacing.three,
          paddingBottom: insets.bottom + BottomTabInset + Spacing.four,
        },
      ]}>
      <ThemedText type="subtitle">{title}</ThemedText>
      {children}
    </ScrollView>
  );
}

export function Card({ title, children, style }: { title?: string; children: ReactNode; style?: ViewStyle }) {
  return (
    <ThemedView type="backgroundElement" style={[styles.card, style]}>
      {title && (
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.cardTitle}>
          {title}
        </ThemedText>
      )}
      {children}
    </ThemedView>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'soft' | 'plain';
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

export function Button({ label, onPress, variant = 'primary', disabled, style, accessibilityLabel }: ButtonProps) {
  const theme = useTheme();
  const background =
    variant === 'primary' ? theme.tint : variant === 'soft' ? theme.tintSoft : 'transparent';
  const color = variant === 'primary' ? theme.onTint : theme.tint;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
        style,
      ]}>
      <ThemedText type="smallBold" style={{ color }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.tint : theme.background,
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      <ThemedText type="small" style={{ color: selected ? theme.onTint : theme.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

type StepperProps = {
  label: string;
  value: string;
  onDecrease: () => void;
  onIncrease: () => void;
  canDecrease?: boolean;
  canIncrease?: boolean;
};

export function Stepper({ label, value, onDecrease, onIncrease, canDecrease = true, canIncrease = true }: StepperProps) {
  return (
    <View style={styles.row}>
      <ThemedText style={styles.rowLabel}>{label}</ThemedText>
      <View style={styles.stepper}>
        <Button
          label="−"
          variant="soft"
          onPress={onDecrease}
          disabled={!canDecrease}
          accessibilityLabel={`Decrease ${label}`}
          style={styles.stepButton}
        />
        <ThemedText type="smallBold" style={styles.stepValue}>
          {value}
        </ThemedText>
        <Button
          label="+"
          variant="soft"
          onPress={onIncrease}
          disabled={!canIncrease}
          accessibilityLabel={`Increase ${label}`}
          style={styles.stepButton}
        />
      </View>
    </View>
  );
}

export const controlStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    minHeight: 44,
  },
});

const styles = StyleSheet.create({
  screen: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  cardTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  button: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
  },
  row: controlStyles.row,
  rowLabel: {
    flexShrink: 1,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  stepButton: {
    width: 44,
    paddingHorizontal: 0,
  },
  stepValue: {
    minWidth: 76,
    textAlign: 'center',
  },
});
