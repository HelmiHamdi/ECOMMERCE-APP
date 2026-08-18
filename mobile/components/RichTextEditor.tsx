import React, { useRef, useState } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  ScrollView,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
} from "react-native";
import { RichEditor, actions, FONT_SIZE } from "react-native-pell-rich-editor";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";

const INK = "#13131A";
const MUTED = "#8D8D96";
const SURFACE = "#F5F5F8";
const BORDER = "#ECECF1";

/* ---------------------------------------------------------
   PALETTE ÉTENDUE (raccourcis rapides) — l'utilisateur peut
   aussi taper N'IMPORTE QUEL code hex via le champ dédié,
   donc TOUTES les couleurs sont accessibles, pas seulement
   celles listées ici.
--------------------------------------------------------- */
const GRAYSCALE = [
  "#000000", "#1A1A1A", "#262626", "#404040", "#595959", "#7F7F7F",
  "#999999", "#A6A6A6", "#BFBFBF", "#D9D9D9", "#E5E5E5", "#F2F2F2", "#FFFFFF",
];

const COLOR_GRID = [
  ["#FDEAEA", "#F8C6C6", "#F19999", "#E64C4C", "#C81E1E", "#7A0F0F"],
  ["#FEF0E6", "#FBD4B4", "#F7B37D", "#F2811D", "#C9660F", "#7A3D08"],
  ["#FEF9E6", "#FCEEB0", "#FADE6E", "#EEC000", "#B89100", "#6E5700"],
  ["#F2F9E6", "#DCEFB4", "#C0E17D", "#8FC31F", "#679312", "#3E5A0B"],
  ["#E8F7EE", "#B9EAC9", "#7ED9A0", "#149A55", "#0E7A42", "#084D2A"],
  ["#E6F6F5", "#B4E7E3", "#7AD5CE", "#12A398", "#0C7C73", "#074E48"],
  ["#E6F2FC", "#B7DAF6", "#7CBDEE", "#1E88E5", "#0F63AC", "#093C68"],
  ["#E8EAF9", "#BCC3EF", "#8B96E3", "#3B4FCB", "#2536A0", "#151F63"],
  ["#F2E9F9", "#DCC1EE", "#C093E1", "#8E24AA", "#6B1B80", "#420F4F"],
  ["#FBE9F2", "#F4BFDB", "#EC8DBE", "#D81B79", "#A2145C", "#640C38"],
  ["#EFEBE9", "#D7CCC8", "#BCAAA4", "#8D6E63", "#5D4037", "#3E2723"],
];

const HIGHLIGHT_GRID = [
  "transparent",
  "#FEF9C3", "#FDE68A", "#FED7AA", "#FECACA", "#FEE2E2",
  "#FCE7F3", "#F5D0FE", "#E9D5FF", "#DDD6FE", "#C7D2FE",
  "#BFDBFE", "#BAE6FD", "#A5F3FC", "#99F6E4", "#A7F3D0",
  "#BBF7D0", "#D9F99D", "#FEF08A", "#E5E7EB", "#D1D5DB",
  "#9CA3AF", "#111827", "#FFFFFF",
];

/* ---------------------------------------------------------
   FONT_SIZE est un type strict exporté par la librairie :
   1 | 2 | 3 | 4 | 5 | 6 | 7 (correspond à 10/13/16/18/24/32/48px)
--------------------------------------------------------- */
const FONT_SIZES: { label: string; value: FONT_SIZE }[] = [
  { label: "10 pt", value: 1 },
  { label: "13 pt", value: 2 },
  { label: "16 pt (Normal)", value: 3 },
  { label: "18 pt", value: 4 },
  { label: "24 pt", value: 5 },
  { label: "32 pt", value: 6 },
  { label: "48 pt (Titre)", value: 7 },
];

const FONT_FAMILIES = [
  { label: "Système", value: "-apple-system, Roboto, sans-serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Sans-serif", value: "sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Garamond", value: "Garamond, serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { label: "Courier / Monospace", value: "'Courier New', monospace" },
  { label: "Cursive", value: "cursive" },
  { label: "Comic Sans", value: "'Comic Sans MS', cursive" },
  { label: "Impact", value: "Impact, sans-serif" },
];

const HEADINGS = [
  { label: "Titre 1", action: actions.heading1, size: 22 },
  { label: "Titre 2", action: actions.heading2, size: 19 },
  { label: "Titre 3", action: actions.heading3, size: 17 },
  { label: "Titre 4", action: actions.heading4, size: 15.5 },
  { label: "Titre 5", action: actions.heading5, size: 14.5 },
  { label: "Titre 6", action: actions.heading6, size: 13.5 },
  { label: "Paragraphe normal", action: actions.setParagraph, size: 14 },
];

const isValidHex = (v: string) => /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(v.trim());

// Échappe les apostrophes pour une insertion sûre dans une string JS injectée via commandDOM
const escapeForJS = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

type Props = {
  initialHTML?: string;
  onChangeHTML: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
};

export default function RichTextEditor({
  initialHTML = "",
  onChangeHTML,
  placeholder,
  minHeight = 180,
}: Props) {
  const editorRef = useRef<RichEditor>(null);

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showFontSizePicker, setShowFontSizePicker] = useState(false);
  const [showFontFamilyPicker, setShowFontFamilyPicker] = useState(false);
  const [showHeadingPicker, setShowHeadingPicker] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);

  const [hexColorInput, setHexColorInput] = useState("");
  const [hexHighlightInput, setHexHighlightInput] = useState("");
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const applyTextColor = (c: string) => {
    editorRef.current?.setForeColor(c);
    setShowColorPicker(false);
    setHexColorInput("");
  };

  const applyHighlightColor = (c: string) => {
    editorRef.current?.setHiliteColor(c);
    setShowHighlightPicker(false);
    setHexHighlightInput("");
  };

  /**
   * setFontName n'existe pas dans react-native-pell-rich-editor.
   * On exécute directement document.execCommand('fontName', ...)
   * dans le WebView via commandDOM, comme le fait la librairie
   * en interne pour setForeColor / setHiliteColor.
   * Nécessite qu'une sélection de texte soit active.
   */
  const applyFontFamily = (fontFamily: string) => {
    editorRef.current?.commandDOM(
      `document.execCommand('fontName', false, '${escapeForJS(fontFamily)}');`
    );
    setShowFontFamilyPicker(false);
  };

  const insertLink = () => {
    if (!linkUrl.trim()) return;
    editorRef.current?.insertLink(linkText.trim() || linkUrl.trim(), linkUrl.trim());
    setLinkText("");
    setLinkUrl("");
    setShowLinkModal(false);
  };

  return (
    <View>
      <View style={styles.editorWrap}>
        <RichEditor
          ref={editorRef}
          initialContentHTML={initialHTML}
          onChange={onChangeHTML}
          placeholder={placeholder}
          initialHeight={minHeight}
          useContainer
          editorStyle={{
            backgroundColor: SURFACE,
            color: INK,
            placeholderColor: "#ABABB2",
            contentCSSText:
              "font-size: 14.5px; font-family: -apple-system, Roboto, sans-serif; padding: 6px; min-height: " +
              minHeight +
              "px;",
          }}
          style={styles.editor}
        />
      </View>

      {/* ---------- LIGNE 1 : Titre / police / taille / style / couleurs ---------- */}
      <View style={styles.toolbarCard}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 6, alignItems: "center" }}
        >
          <ToolBtn label="Titre" onPress={() => setShowHeadingPicker(true)}>
            <MaterialIcons name="title" size={19} color={INK} />
          </ToolBtn>
          <ToolBtn label="Police" onPress={() => setShowFontFamilyPicker(true)}>
            <Text style={styles.textIcon}>Aa</Text>
          </ToolBtn>
          <ToolBtn label="Taille" onPress={() => setShowFontSizePicker(true)}>
            <MaterialIcons name="format-size" size={19} color={INK} />
          </ToolBtn>

          <Divider />

          <ToolBtn onPress={() => editorRef.current?.sendAction(actions.setBold, "result")}>
            <Text style={[styles.textIcon, { fontWeight: "900" }]}>B</Text>
          </ToolBtn>
          <ToolBtn onPress={() => editorRef.current?.sendAction(actions.setItalic, "result")}>
            <Text style={[styles.textIcon, { fontStyle: "italic" }]}>I</Text>
          </ToolBtn>
          <ToolBtn onPress={() => editorRef.current?.sendAction(actions.setUnderline, "result")}>
            <Text style={[styles.textIcon, { textDecorationLine: "underline" }]}>S</Text>
          </ToolBtn>
          <ToolBtn onPress={() => editorRef.current?.sendAction(actions.setStrikethrough, "result")}>
            <Text style={[styles.textIcon, { textDecorationLine: "line-through" }]}>S</Text>
          </ToolBtn>
          <ToolBtn onPress={() => editorRef.current?.sendAction(actions.setSubscript, "result")}>
            <MaterialCommunityIcons name="format-subscript" size={19} color={INK} />
          </ToolBtn>
          <ToolBtn onPress={() => editorRef.current?.sendAction(actions.setSuperscript, "result")}>
            <MaterialCommunityIcons name="format-superscript" size={19} color={INK} />
          </ToolBtn>

          <Divider />

          <ToolBtn label="Couleur" onPress={() => setShowColorPicker(true)}>
            <MaterialIcons name="format-color-text" size={19} color={INK} />
          </ToolBtn>
          <ToolBtn label="Fond" onPress={() => setShowHighlightPicker(true)}>
            <MaterialIcons name="format-color-fill" size={19} color={INK} />
          </ToolBtn>
        </ScrollView>
      </View>

      {/* ---------- LIGNE 2 : Alignement / retrait / listes / structure / lien / historique ---------- */}
      <View style={[styles.toolbarCard, { marginTop: 8 }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 6, alignItems: "center" }}
        >
          <ToolBtn onPress={() => editorRef.current?.sendAction(actions.alignLeft, "result")}>
            <MaterialIcons name="format-align-left" size={19} color={INK} />
          </ToolBtn>
          <ToolBtn onPress={() => editorRef.current?.sendAction(actions.alignCenter, "result")}>
            <MaterialIcons name="format-align-center" size={19} color={INK} />
          </ToolBtn>
          <ToolBtn onPress={() => editorRef.current?.sendAction(actions.alignRight, "result")}>
            <MaterialIcons name="format-align-right" size={19} color={INK} />
          </ToolBtn>
          <ToolBtn onPress={() => editorRef.current?.sendAction(actions.alignFull, "result")}>
            <MaterialIcons name="format-align-justify" size={19} color={INK} />
          </ToolBtn>

          <Divider />

          <ToolBtn onPress={() => editorRef.current?.sendAction(actions.indent, "result")}>
            <MaterialIcons name="format-indent-increase" size={19} color={INK} />
          </ToolBtn>
          <ToolBtn onPress={() => editorRef.current?.sendAction(actions.outdent, "result")}>
            <MaterialIcons name="format-indent-decrease" size={19} color={INK} />
          </ToolBtn>

          <Divider />

          <ToolBtn onPress={() => editorRef.current?.sendAction(actions.insertBulletsList, "result")}>
            <MaterialIcons name="format-list-bulleted" size={19} color={INK} />
          </ToolBtn>
          <ToolBtn onPress={() => editorRef.current?.sendAction(actions.insertOrderedList, "result")}>
            <MaterialIcons name="format-list-numbered" size={19} color={INK} />
          </ToolBtn>
          <ToolBtn onPress={() => editorRef.current?.sendAction(actions.checkboxList, "result")}>
            <MaterialIcons name="checklist" size={19} color={INK} />
          </ToolBtn>
          <ToolBtn onPress={() => editorRef.current?.sendAction(actions.blockquote, "result")}>
            <MaterialIcons name="format-quote" size={19} color={INK} />
          </ToolBtn>
          <ToolBtn onPress={() => editorRef.current?.sendAction(actions.code, "result")}>
            <MaterialIcons name="code" size={19} color={INK} />
          </ToolBtn>
          <ToolBtn onPress={() => editorRef.current?.sendAction(actions.insertLine, "result")}>
            <MaterialIcons name="horizontal-rule" size={19} color={INK} />
          </ToolBtn>

          <Divider />

          <ToolBtn onPress={() => setShowLinkModal(true)}>
            <MaterialIcons name="link" size={19} color={INK} />
          </ToolBtn>

          <Divider />

          <ToolBtn onPress={() => editorRef.current?.sendAction(actions.undo, "result")}>
            <MaterialIcons name="undo" size={19} color={INK} />
          </ToolBtn>
          <ToolBtn onPress={() => editorRef.current?.sendAction(actions.redo, "result")}>
            <MaterialIcons name="redo" size={19} color={INK} />
          </ToolBtn>
          <ToolBtn onPress={() => editorRef.current?.sendAction(actions.removeFormat, "result")}>
            <MaterialIcons name="format-clear" size={19} color="#DC2626" />
          </ToolBtn>
        </ScrollView>
      </View>

      {/* ---------- Titres ---------- */}
      <PickerModal visible={showHeadingPicker} onClose={() => setShowHeadingPicker(false)} title="Style de titre">
        <ScrollView style={{ maxHeight: 380 }}>
          <View style={{ gap: 8 }}>
            {HEADINGS.map((h) => (
              <TouchableOpacity
                key={h.label}
                onPress={() => {
                  editorRef.current?.sendAction(h.action, "result");
                  setShowHeadingPicker(false);
                }}
                style={styles.optionRow}
              >
                <Text style={{ fontSize: h.size, fontWeight: "800", color: INK }}>{h.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </PickerModal>

      {/* ---------- Couleur du texte — palette + N'IMPORTE QUEL hex ---------- */}
      <PickerModal visible={showColorPicker} onClose={() => setShowColorPicker(false)} title="Couleur du texte">
        <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>Code personnalisé (toutes les couleurs)</Text>
          <View style={styles.hexRow}>
            <View
              style={[
                styles.hexPreview,
                { backgroundColor: isValidHex(hexColorInput) ? hexColorInput : "#FFFFFF" },
              ]}
            />
            <TextInput
              value={hexColorInput}
              onChangeText={setHexColorInput}
              placeholder="#FF6600"
              placeholderTextColor="#ABABB2"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={7}
              style={styles.hexInput}
            />
            <TouchableOpacity
              disabled={!isValidHex(hexColorInput)}
              onPress={() => applyTextColor(hexColorInput.trim())}
              style={[styles.hexApplyBtn, { opacity: isValidHex(hexColorInput) ? 1 : 0.4 }]}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>OK</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionLabel}>Niveaux de gris</Text>
          <View style={styles.swatchRow}>
            {GRAYSCALE.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => applyTextColor(c)}
                style={[styles.swatch, { backgroundColor: c, borderWidth: 1, borderColor: BORDER }]}
              />
            ))}
          </View>

          <Text style={styles.sectionLabel}>Couleurs et nuances</Text>
          {COLOR_GRID.map((row, i) => (
            <View key={i} style={styles.swatchRow}>
              {row.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => applyTextColor(c)}
                  style={[styles.swatch, { backgroundColor: c }]}
                />
              ))}
            </View>
          ))}
        </ScrollView>
      </PickerModal>

      {/* ---------- Couleur de fond / surlignage — palette + hex ---------- */}
      <PickerModal visible={showHighlightPicker} onClose={() => setShowHighlightPicker(false)} title="Couleur de fond">
        <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>Code personnalisé (toutes les couleurs)</Text>
          <View style={styles.hexRow}>
            <View
              style={[
                styles.hexPreview,
                {
                  backgroundColor: isValidHex(hexHighlightInput) ? hexHighlightInput : "#FFFFFF",
                  borderWidth: 1,
                  borderColor: BORDER,
                },
              ]}
            />
            <TextInput
              value={hexHighlightInput}
              onChangeText={setHexHighlightInput}
              placeholder="#FFEE00"
              placeholderTextColor="#ABABB2"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={7}
              style={styles.hexInput}
            />
            <TouchableOpacity
              disabled={!isValidHex(hexHighlightInput)}
              onPress={() => applyHighlightColor(hexHighlightInput.trim())}
              style={[styles.hexApplyBtn, { opacity: isValidHex(hexHighlightInput) ? 1 : 0.4 }]}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>OK</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionLabel}>Couleurs rapides</Text>
          <View style={styles.swatchRow}>
            {HIGHLIGHT_GRID.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => applyHighlightColor(c)}
                style={[
                  styles.swatch,
                  { backgroundColor: c === "transparent" ? "#FFFFFF" : c, borderWidth: 1.5, borderColor: BORDER },
                ]}
              >
                {c === "transparent" && (
                  <MaterialIcons name="block" size={16} color="#DC2626" style={{ margin: 8 }} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </PickerModal>

      {/* ---------- Taille du texte ---------- */}
      <PickerModal visible={showFontSizePicker} onClose={() => setShowFontSizePicker(false)} title="Taille du texte">
        <View style={{ gap: 8 }}>
          {FONT_SIZES.map((f) => (
            <TouchableOpacity
              key={f.value}
              onPress={() => {
                editorRef.current?.setFontSize(f.value);
                setShowFontSizePicker(false);
              }}
              style={styles.optionRow}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: INK }}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </PickerModal>

      {/* ---------- Police (via commandDOM, execCommand fontName) ---------- */}
      <PickerModal visible={showFontFamilyPicker} onClose={() => setShowFontFamilyPicker(false)} title="Police">
        <ScrollView style={{ maxHeight: 420 }}>
          <View style={{ gap: 8 }}>
            {FONT_FAMILIES.map((f) => (
              <TouchableOpacity
                key={f.value}
                onPress={() => applyFontFamily(f.value)}
                style={styles.optionRow}
              >
                <Text style={{ fontSize: 14, fontWeight: "600", color: INK }}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </PickerModal>

      {/* ---------- Insertion de lien ---------- */}
      <PickerModal visible={showLinkModal} onClose={() => setShowLinkModal(false)} title="Insérer un lien">
        <View style={{ gap: 10 }}>
          <TextInput
            value={linkText}
            onChangeText={setLinkText}
            placeholder="Texte affiché (optionnel)"
            placeholderTextColor="#ABABB2"
            style={styles.linkInput}
          />
          <TextInput
            value={linkUrl}
            onChangeText={setLinkUrl}
            placeholder="https://..."
            placeholderTextColor="#ABABB2"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={styles.linkInput}
          />
          <TouchableOpacity onPress={insertLink} style={styles.linkConfirmBtn} activeOpacity={0.85}>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Insérer</Text>
          </TouchableOpacity>
        </View>
      </PickerModal>
    </View>
  );
}

const ToolBtn = ({
  children,
  onPress,
  label,
}: {
  children: React.ReactNode;
  onPress: () => void;
  label?: string;
}) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.toolBtn}>
    {children}
    {label && <Text style={styles.toolBtnLabel}>{label}</Text>}
  </TouchableOpacity>
);

const Divider = () => <View style={styles.divider} />;

const PickerModal = ({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <Pressable style={styles.modalBackdrop} onPress={onClose}>
      <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>{title}</Text>
        {children}
      </Pressable>
    </Pressable>
  </Modal>
);

const styles = StyleSheet.create({
  editorWrap: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    overflow: "hidden",
  },
  editor: { borderRadius: 14 },
  toolbarCard: {
    marginTop: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  toolBtn: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 38,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginHorizontal: 2,
    borderRadius: 10,
  },
  toolBtnLabel: { fontSize: 9, fontWeight: "700", color: MUTED, marginTop: 2 },
  textIcon: { fontSize: 16, fontWeight: "700", color: INK },
  divider: { width: 1, height: 22, backgroundColor: BORDER, marginHorizontal: 6 },
  sectionLabel: { fontSize: 11.5, fontWeight: "800", color: MUTED, marginTop: 10, marginBottom: 8 },
  swatchRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 4 },
  swatch: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  optionRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  hexRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  hexPreview: { width: 40, height: 40, borderRadius: 10 },
  hexInput: {
    flex: 1,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: INK,
  },
  hexApplyBtn: {
    backgroundColor: INK,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  linkInput: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: INK,
  },
  linkConfirmBtn: {
    backgroundColor: INK,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: "center", marginBottom: 14 },
  modalTitle: { fontSize: 15, fontWeight: "800", color: INK, marginBottom: 14 },
});