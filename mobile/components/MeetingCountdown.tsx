import { useEffect, useState } from "react";
import { View, Text } from "react-native";

type Props = {
  targetDate: string | Date;
};

const pad = (n: number) => n.toString().padStart(2, "0");

const getTimeLeft = (targetDate: string | Date) => {
  const total = new Date(targetDate).getTime() - Date.now();
  return {
    total,
    days: Math.max(Math.floor(total / (1000 * 60 * 60 * 24)), 0),
    hours: Math.max(Math.floor((total / (1000 * 60 * 60)) % 24), 0),
    minutes: Math.max(Math.floor((total / (1000 * 60)) % 60), 0),
    seconds: Math.max(Math.floor((total / 1000) % 60), 0),
  };
};

export default function MeetingCountdown({ targetDate }: Props) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(targetDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(targetDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (timeLeft.total <= 0) {
    return (
      <View className="bg-red-100 rounded-xl px-3 py-2 self-start">
        <Text className="text-red-600 font-semibold text-xs">
          En cours / terminée
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-row items-center bg-emerald-50 rounded-xl px-3 py-2 self-start">
      <Text className="text-emerald-700 font-bold text-sm">
        {timeLeft.days > 0 ? `${timeLeft.days}j ` : ""}
        {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
      </Text>
    </View>
  );
}