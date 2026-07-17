import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Calendar, DateData, LocaleConfig } from "react-native-calendars";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "@/constants";

const INK = "#13131A";
const MUTED = "#8D8D96";
const SURFACE = "#F7F7FA";
const BORDER = "#ECECF0";
const PAPER = "#FFFFFF";

const toISO = (d: Date) => d.toISOString().slice(0, 10);

const MONTHS_FR = [
  "JANV.", "FÉVR.", "MARS", "AVR.", "MAI", "JUIN",
  "JUIL.", "AOÛT", "SEPT.", "OCT.", "NOV.", "DÉC.",
];
const MONTHS_FR_FULL = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const WEEKDAYS_FR = ["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"];

// 👇 CORRECTION — react-native-calendars ne lit jamais MONTHS_FR / WEEKDAYS_FR
// directement : l'en-tête des jours de la semaine (Sun/Mon/Tue...) vient de
// LocaleConfig, qui est en anglais par défaut. On enregistre donc un locale "fr".
LocaleConfig.locales["fr"] = {
  monthNames: MONTHS_FR_FULL,
  monthNamesShort: MONTHS_FR,
  dayNames: ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
  dayNamesShort: WEEKDAYS_FR,
  today: "Aujourd'hui",
};
LocaleConfig.defaultLocale = "fr";

type Props = {
  visible: boolean;
  selectedDate: string | null;
  minDate?: string;
  maxDate?: string;
  title: string;
  closeLabel: string;
  todayLabel?: string;
  onSelect: (date: string) => void;
  onClose: () => void;
};

// Ligne perforée façon ticket : pointillés + encoches demi-cercle sur les bords
function PerforatedDivider() {
  const dots = new Array(28).fill(0);
  return (
    <View style={{ height: 20, justifyContent: "center" }}>
      <View
        style={{
          position: "absolute",
          left: -10,
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: "#23232E",
        }}
      />
      <View
        style={{
          position: "absolute",
          right: -10,
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: "#23232E",
        }}
      />
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 22 }}>
        {dots.map((_, i) => (
          <View
            key={i}
            style={{
              width: 3,
              height: 3,
              borderRadius: 1.5,
              backgroundColor: BORDER,
            }}
          />
        ))}
      </View>
    </View>
  );
}

// Le "signature element" : mini page de calendrier à effeuiller, légèrement inclinée
function TornDateBadge({ dateISO }: { dateISO: string }) {
  const d = new Date(
    Number(dateISO.slice(0, 4)),
    Number(dateISO.slice(5, 7)) - 1,
    Number(dateISO.slice(8, 10))
  );
  const day = d.getDate().toString().padStart(2, "0");
  const month = MONTHS_FR[d.getMonth()];
  const weekday = WEEKDAYS_FR[d.getDay()];

  return (
    <View style={{ transform: [{ rotate: "-4deg" }], marginRight: 14 }}>
      <View
        style={{
          position: "absolute",
          top: -8,
          left: "50%",
          marginLeft: -18,
          width: 36,
          height: 14,
          backgroundColor: "rgba(255,255,255,0.55)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.7)",
          transform: [{ rotate: "3deg" }],
          zIndex: 2,
        }}
      />
      <View
        style={{
          width: 62,
          backgroundColor: PAPER,
          borderRadius: 8,
          paddingTop: 6,
          paddingBottom: 8,
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.18,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <View
          style={{
            alignSelf: "stretch",
            backgroundColor: COLORS.primary,
            paddingVertical: 3,
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
            marginBottom: 4,
          }}
        >
          <Text
            style={{
              textAlign: "center",
              color: "#fff",
              fontSize: 9,
              fontWeight: "800",
              letterSpacing: 0.5,
            }}
          >
            {month}
          </Text>
        </View>
        <Text style={{ fontSize: 26, fontWeight: "900", color: INK, letterSpacing: -0.5, lineHeight: 28 }}>
          {day}
        </Text>
        <Text style={{ fontSize: 9, fontWeight: "700", color: MUTED, letterSpacing: 1, marginTop: 1 }}>
          {weekday}
        </Text>
      </View>
    </View>
  );
}

// Overlay de sélection rapide mois / année, dans le même style "papier"
function MonthYearPicker({
  viewDate,
  minDate,
  maxDate,
  onPick,
  onClose,
}: {
  viewDate: Date;
  minDate?: string;
  maxDate?: string;
  onPick: (year: number, month: number) => void;
  onClose: () => void;
}) {
  const [pickerYear, setPickerYear] = useState(viewDate.getFullYear());

  const minYear = minDate ? Number(minDate.slice(0, 4)) : pickerYear - 50;
  const maxYear = maxDate ? Number(maxDate.slice(0, 4)) : pickerYear + 50;

  const isMonthDisabled = (monthIndex: number) => {
    const first = new Date(pickerYear, monthIndex, 1);
    const last = new Date(pickerYear, monthIndex + 1, 0);
    if (minDate && toISO(last) < minDate) return true;
    if (maxDate && toISO(first) > maxDate) return true;
    return false;
  };

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: PAPER,
        zIndex: 10,
        paddingHorizontal: 16,
        paddingTop: 8,
      }}
    >
      {/* Sélecteur d'année */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: SURFACE,
          borderRadius: 16,
          paddingVertical: 6,
          paddingHorizontal: 8,
          marginBottom: 14,
        }}
      >
        <TouchableOpacity
          onPress={() => setPickerYear((y) => Math.max(minYear, y - 1))}
          disabled={pickerYear <= minYear}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: PAPER,
            alignItems: "center",
            justifyContent: "center",
            opacity: pickerYear <= minYear ? 0.35 : 1,
          }}
        >
          <Ionicons name="chevron-back" size={16} color={COLORS.primary} />
        </TouchableOpacity>

        <Text style={{ fontSize: 18, fontWeight: "900", color: INK, letterSpacing: 0.5 }}>
          {pickerYear}
        </Text>

        <TouchableOpacity
          onPress={() => setPickerYear((y) => Math.min(maxYear, y + 1))}
          disabled={pickerYear >= maxYear}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: PAPER,
            alignItems: "center",
            justifyContent: "center",
            opacity: pickerYear >= maxYear ? 0.35 : 1,
          }}
        >
          <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Grille des mois */}
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {MONTHS_FR_FULL.map((label, index) => {
            const disabled = isMonthDisabled(index);
            const isCurrentSelection =
              pickerYear === viewDate.getFullYear() && index === viewDate.getMonth();
            return (
              <TouchableOpacity
                key={label}
                disabled={disabled}
                onPress={() => onPick(pickerYear, index)}
                style={{
                  width: "31%",
                  paddingVertical: 14,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isCurrentSelection ? COLORS.primary : SURFACE,
                  opacity: disabled ? 0.35 : 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: isCurrentSelection ? "#fff" : INK,
                  }}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <TouchableOpacity
        onPress={onClose}
        style={{
          marginTop: 12,
          marginBottom: 4,
          paddingVertical: 12,
          borderRadius: 14,
          alignItems: "center",
          backgroundColor: SURFACE,
        }}
      >
        <Text style={{ fontWeight: "700", fontSize: 13, color: INK }}>Retour au calendrier</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function CalendarPickerModal({
  visible,
  selectedDate,
  minDate,
  maxDate,
  title,
  closeLabel,
  todayLabel = "Aujourd'hui",
  onSelect,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const todayISO = useMemo(() => toISO(new Date()), []);

  const [viewDate, setViewDate] = useState<Date>(
    selectedDate ? new Date(selectedDate) : new Date()
  );
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);

  // Resynchronise la vue quand le modal s'ouvre ou que la date change de l'extérieur
  useEffect(() => {
    if (visible) {
      setViewDate(selectedDate ? new Date(selectedDate) : new Date());
      setShowMonthYearPicker(false);
    }
  }, [visible, selectedDate]);

  const canPickToday = useMemo(() => {
    if (minDate && todayISO < minDate) return false;
    if (maxDate && todayISO > maxDate) return false;
    return true;
  }, [minDate, maxDate, todayISO]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(13,13,20,0.55)", justifyContent: "flex-end" }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: PAPER,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            overflow: "hidden",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -6 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
            elevation: 12,
            // 👇 CORRECTION — on limite la hauteur totale du modal en tenant
            // compte de la zone sûre (bas d'écran / barre de gestes), pour que
            // le footer (Aujourd'hui / Fermer) ne soit jamais rogné.
            maxHeight: `${90 - Math.round((insets.bottom / 8))}%`,
            // 👇 CORRECTION — le modal est maintenant un conteneur flex en
            // colonne : header et footer gardent leur taille naturelle (fixes),
            // et seule la zone du calendrier est autorisée à rétrécir /
            // scroller. Avant, tout était empilé sans contrainte de flex, donc
            // dès que le contenu dépassait la hauteur de l'écran, c'est le
            // footer (Today / Close) qui se retrouvait poussé hors champ.
            flexDirection: "column",
          }}
        >
          {/* Drag handle */}
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: "rgba(255,255,255,0.5)",
              position: "absolute",
              top: 8,
              left: "50%",
              marginLeft: -20,
              zIndex: 2,
            }}
          />

          {/* Header — hauteur fixe, ne rétrécit jamais */}
          <View
            style={{
              backgroundColor: INK,
              paddingTop: 24,
              paddingBottom: 18,
              paddingHorizontal: 20,
              flexDirection: "row",
              alignItems: "center",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <View
              style={{
                position: "absolute",
                width: 260,
                height: 260,
                borderRadius: 130,
                backgroundColor: "#23232E",
                top: -140,
                right: -90,
              }}
            />
            <View
              style={{
                position: "absolute",
                width: 140,
                height: 140,
                borderRadius: 70,
                backgroundColor: COLORS.primary,
                opacity: 0.16,
                top: -50,
                left: -30,
              }}
            />

            {selectedDate ? (
              <TornDateBadge dateISO={selectedDate} />
            ) : (
              <View
                style={{
                  width: 62,
                  height: 66,
                  borderRadius: 8,
                  borderWidth: 1.5,
                  borderColor: "rgba(255,255,255,0.25)",
                  borderStyle: "dashed",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 14,
                }}
              >
                <Ionicons name="calendar-outline" size={20} color="rgba(255,255,255,0.4)" />
              </View>
            )}

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 10,
                  fontWeight: "800",
                  letterSpacing: 1.2,
                  marginBottom: 3,
                }}
              >
                SÉLECTIONNER UNE DATE
              </Text>
              <Text style={{ color: "#fff", fontSize: 17, fontWeight: "800", letterSpacing: 0.1 }}>
                {title}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              hitSlop={10}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: "rgba(255,255,255,0.12)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Séparation perforée - signature "ticket" — fixe */}
          <View style={{ flexShrink: 0 }}>
            <PerforatedDivider />
          </View>

          {/* 👇 CORRECTION — Zone calendrier / sélecteur mois-année, mise dans
              un ScrollView flexible (flex: 1). C'est cette zone-là, et
              uniquement elle, qui rétrécit ou scrolle si l'écran est petit.
              Le footer juste en dessous reste donc TOUJOURS entièrement
              visible, quelle que soit la taille de l'écran. */}
          <ScrollView
            style={{ flexGrow: 0, flexShrink: 1 }}
            contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 4, paddingBottom: 4 }}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Calendar
              current={toISO(viewDate)}
              minDate={minDate}
              maxDate={maxDate}
              firstDay={1}
              onDayPress={(day: DateData) => {
                onSelect(day.dateString);
                onClose();
              }}
              onMonthChange={(m) => setViewDate(new Date(m.year, m.month - 1, 1))}
              markedDates={
                selectedDate
                  ? {
                      [selectedDate]: {
                        selected: true,
                        selectedColor: COLORS.primary,
                      },
                    }
                  : {}
              }
              hideExtraDays
              enableSwipeMonths
              // En-tête tactile : ouvre le sélecteur rapide mois / année
              renderHeader={() => (
                <TouchableOpacity
                  onPress={() => setShowMonthYearPicker(true)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: "800", color: INK, letterSpacing: 0.2 }}>
                    {MONTHS_FR_FULL[viewDate.getMonth()]} {viewDate.getFullYear()}
                  </Text>
                  <View
                    style={{
                      marginLeft: 6,
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: `${COLORS.primary}18`,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="chevron-down" size={12} color={COLORS.primary} />
                  </View>
                </TouchableOpacity>
              )}
              renderArrow={(direction: "left" | "right") => (
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: SURFACE,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name={direction === "left" ? "chevron-back" : "chevron-forward"}
                    size={16}
                    color={COLORS.primary}
                  />
                </View>
              )}
              theme={{
                backgroundColor: PAPER,
                calendarBackground: PAPER,
                textSectionTitleColor: MUTED,
                todayTextColor: COLORS.primary,
                todayBackgroundColor: `${COLORS.primary}14`,
                dayTextColor: INK,
                textDisabledColor: "#D6D6DC",
                monthTextColor: INK,
                textMonthFontWeight: "800",
                textMonthFontSize: 16,
                selectedDayBackgroundColor: COLORS.primary,
                selectedDayTextColor: "#fff",
                arrowColor: COLORS.primary,
                textDayFontWeight: "600",
                textDayFontSize: 14,
                textDayHeaderFontWeight: "700",
                textDayHeaderFontSize: 12,
              }}
              style={{
                borderRadius: 16,
              }}
            />

            {showMonthYearPicker && (
              <MonthYearPicker
                viewDate={viewDate}
                minDate={minDate}
                maxDate={maxDate}
                onPick={(year, month) => {
                  setViewDate(new Date(year, month, 1));
                  setShowMonthYearPicker(false);
                }}
                onClose={() => setShowMonthYearPicker(false)}
              />
            )}
          </ScrollView>

          {/* Footer actions — 👇 CORRECTION — flexShrink: 0 pour qu'il garde
              toujours sa taille complète, + paddingBottom qui inclut la
              safe-area du bas (barre de gestes / home indicator), pour qu'il
              ne soit jamais collé ni caché par la barre système. */}
          <View
            style={{
              flexDirection: "row",
              gap: 10,
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
              borderTopWidth: 1,
              borderTopColor: BORDER,
              marginTop: 4,
              flexShrink: 0,
              backgroundColor: PAPER,
            }}
          >
            <TouchableOpacity
              onPress={() => {
                if (!canPickToday) return;
                onSelect(todayISO);
                onClose();
              }}
              disabled={!canPickToday}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 16,
                alignItems: "center",
                backgroundColor: canPickToday ? `${COLORS.primary}14` : SURFACE,
                flexDirection: "row",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name="today-outline"
                size={16}
                color={canPickToday ? COLORS.primary : MUTED}
                style={{ marginRight: 6 }}
              />
              <Text
                style={{
                  fontWeight: "700",
                  fontSize: 14,
                  color: canPickToday ? COLORS.primary : MUTED,
                }}
              >
                {todayLabel}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 16,
                alignItems: "center",
                backgroundColor: SURFACE,
                flexDirection: "row",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close-outline" size={16} color={INK} style={{ marginRight: 6 }} />
              <Text style={{ fontWeight: "700", fontSize: 14, color: INK }}>{closeLabel}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}