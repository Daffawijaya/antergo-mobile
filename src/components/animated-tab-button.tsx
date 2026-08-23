import { Children, Fragment, isValidElement, useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  View,
  type GestureResponderEvent,
} from "react-native";

type Props = {
  children: React.ReactNode;
  onPress?: ((e: GestureResponderEvent) => void) | null;
  onLongPress?: ((e: GestureResponderEvent) => void) | null;
} & Record<string, unknown>;

export function AnimatedTabButton({
  children,
  onPress,
  onLongPress,
  ...props
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  // expo-router mengirim state aktif sebagai aria-selected
  const focused = Boolean(props["aria-selected"]);
  const wasFocused = useRef(focused);

  useEffect(() => {
    if (!wasFocused.current && focused) {
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.15,
          useNativeDriver: true,
          speed: 50,
          bounciness: 8,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 40,
          bounciness: 10,
        }),
      ]).start();
    }
    wasFocused.current = focused;
  }, [focused, scale]);

  const { hoverEffect, ...restProps } = props as Record<string, unknown>;

  const flat = Children.toArray(children).flatMap((child) =>
    isValidElement(child) && child.type === Fragment
      ? Children.toArray(
          (child.props as { children?: React.ReactNode }).children
        )
      : [child]
  );
  const [icon, ...rest] = flat;

  return (
    <Pressable
      {...restProps}
      onPress={onPress}
      onLongPress={onLongPress}
      android_ripple={undefined}
      style={[props.style as object, { backgroundColor: "transparent" }]}
    >
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Animated.View style={{ transform: [{ scale }] }}>
          {icon}
        </Animated.View>
        {rest}
      </View>
    </Pressable>
  );
}
