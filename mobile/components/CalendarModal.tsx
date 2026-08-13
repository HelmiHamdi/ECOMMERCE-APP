import { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Platform,
  StyleSheet,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { X, Check } from "lucide-react-native";

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (date: Date) => void;
  initialDate?: Date;
  minimumDate?: Date;
}

export default function CalendarModal({
  visible,
  onClose,
  onConfirm,
  initialDate,
  minimumDate,
}: CalendarModalProps) {
  const [tempDate, setTempDate] = useState<Date>(initialDate || new Date());
  const [step, setStep] = useState<"date" | "time">("date");

  const handleDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") {
      if (event.type === "dismissed") {
        onClose();
        return;
      }
      if (selected) {
        if (step === "date") {
          setTempDate(selected);
          setStep("time");
        } else {
          const finalDate = new Date(tempDate);
          finalDate.setHours(selected.getHours());
          finalDate.setMinutes(selected.getMinutes());
          setStep("date");
          onConfirm(finalDate);
        }
      }
      return;
    }
    // iOS: le picker met à jour en continu, on stocke juste la valeur
    if (selected) setTempDate(selected);
  };

  const handleConfirmIOS = () => {
    onConfirm(tempDate);
  };

  if (!visible) return null;

  // Android : pas de modal custom, le système affiche son propre dialog natif
  if (Platform.OS === "android") {
    return (
      <DateTimePicker
        value={tempDate}
        mode={step}
        display="default"
        minimumDate={minimumDate}
        onChange={handleDateChange}
      />
    );
  }

  // iOS : modal custom avec picker inline
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
              <X size={20} color="#6b7280" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Sélectionner date et heure</Text>
            <TouchableOpacity onPress={handleConfirmIOS} style={styles.headerBtn}>
              <Check size={20} color="#059669" />
            </TouchableOpacity>
          </View>

          <DateTimePicker
            value={tempDate}
            mode="datetime"
            display="spinner"
            minimumDate={minimumDate}
            onChange={handleDateChange}
            style={styles.picker}
            locale="fr-FR"
          />

          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmIOS}>
            <Text style={styles.confirmBtnText}>Confirmer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  headerBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  picker: {
    alignSelf: "center",
  },
  confirmBtn: {
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: "#000",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmBtnText: {
    color: "white",
    fontWeight: "600",
    fontSize: 15,
  },
});