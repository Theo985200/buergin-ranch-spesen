"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Receipt,
  Download,
  Plus,
  Wallet,
  Upload,
  Users,
  Camera,
  Trash2,
  Filter,
  CheckCircle2,
  Clock3,
  RefreshCw,
  AlertCircle,
  FileText,
  FileImage,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ExpenseRow = {
  id: string;
  entered_by: string | null;
  date: string;
  name: string;
  amount: number;
  category: string;
  description: string | null;
  receipt_url: string | null;
  receipt_name: string | null;
  status: "offen" | "bezahlt";
  created_at?: string;
};

const PEOPLE = ["Märk", "Elle", "Ruth", "Theo"];
const CATEGORIES = ["Treibstoff", "Material", "Werkzeug", "Sonstiges"];
const STATUS = ["offen", "bezahlt"] as const;
const ACCESS_CODE = "ranch2026";
const SUPABASE_BUCKET = "receipts";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

function currency(value: number) {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: "CHF",
    minimumFractionDigits: 2,
  }).format(value || 0);
}

function formatDate(date: string) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("de-CH").format(new Date(date));
}

function monthKey(date: string) {
  return date?.slice(0, 7) || "Unbekannt";
}

function monthLabel(dateKey: string) {
  if (!dateKey || dateKey === "Unbekannt") return dateKey;
  const [year, month] = dateKey.split("-");
  return `${month}.${year}`;
}

function exportCsv(entries: ExpenseRow[]) {
  const headers = [
    "Erfasst von",
    "Name",
    "Datum",
    "Betrag_CHF",
    "Kategorie",
    "Beschreibung",
    "Beleg_Name",
    "Beleg_URL",
    "Status",
  ];

  const rows = entries.map((entry) => [
    entry.entered_by || "",
    entry.name || "",
    entry.date || "",
    String(entry.amount ?? ""),
    entry.category || "",
    entry.description || "",
    entry.receipt_name || "",
    entry.receipt_url || "",
    entry.status || "",
  ]);

  const csv = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";")
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `buergin-ranch-spesen-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function printMonthlyReport(entries: ExpenseRow[]) {
  const grouped = Array.from(
    entries.reduce((map, entry) => {
      const key = monthKey(entry.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
      return map;
    }, new Map<string, ExpenseRow[]>())
  ).sort((a, b) => b[0].localeCompare(a[0]));

  const html = `
    <html>
      <head>
        <title>Bürgin Ranch Spesen - Monatsbericht</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          h1 { margin-bottom: 8px; }
          h2 { margin-top: 28px; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; text-align: left; }
          th { background: #f3f4f6; }
          .total { margin-top: 8px; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Bürgin Ranch Spesen</h1>
        <div>Monatsbericht</div>
        ${grouped
          .map(([month, monthEntries]) => {
            const total = monthEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
            return `
              <h2>${monthLabel(month)}</h2>
              <table>
                <thead>
                  <tr>
                    <th>Erfasst von</th>
                    <th>Name</th>
                    <th>Datum</th>
                    <th>Kategorie</th>
                    <th>Beschreibung</th>
                    <th>Betrag</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${monthEntries
                    .map(
                      (entry) => `
                    <tr>
                      <td>${entry.entered_by || "-"}</td>
                      <td>${entry.name || "-"}</td>
                      <td>${formatDate(entry.date)}</td>
                      <td>${entry.category || "-"}</td>
                      <td>${entry.description || "-"}</td>
                      <td>${currency(Number(entry.amount || 0))}</td>
                      <td>${entry.status || "-"}</td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
              <div class="total">Total ${monthLabel(month)}: ${currency(total)}</div>
            `;
          })
          .join("")}
      </body>
    </html>
  `;

  const printWindow = window.open("", "_blank", "width=1200,height=900");
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function StatCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  tone: "emerald" | "red" | "green";
}) {
  const styles = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    red: "border-red-200 bg-red-50 text-red-800",
    green: "border-green-200 bg-green-50 text-green-800",
  };

  return (
    <Card className={`rounded-3xl border shadow-sm ${styles[tone]}`}>
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-white/80 p-3 shadow-sm">{icon}</div>
          <div>
            <div className="text-sm opacity-75">{title}</div>
            <div className="text-2xl font-bold">{value}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Page() {
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState("");

  const [entries, setEntries] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [enteredBy, setEnteredBy] = useState("Theo");
  const [name, setName] = useState("Theo");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Treibstoff");
  const [description, setDescription] = useState("");
  const [receiptLink, setReceiptLink] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const [filterName, setFilterName] = useState("alle");
  const [filterStatus, setFilterStatus] = useState("alle");
  const [filterMonth, setFilterMonth] = useState("alle");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("buergin-ranch-unlocked");
    if (saved === "yes") setUnlocked(true);
  }, []);

  async function loadEntries() {
    if (!supabase) {
      setErrorMessage("Supabase ist nicht konfiguriert.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setEntries((data || []) as ExpenseRow[]);
    setLoading(false);
  }

  useEffect(() => {
    if (unlocked) {
      loadEntries();
    }
  }, [unlocked]);

  async function uploadReceipt(file: File) {
    if (!supabase) return { url: "", name: "" };

    const extension = file.name.split(".").pop() || "file";
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${extension}`;
    const filePath = `uploads/${fileName}`;

    const { error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(filePath, file, { upsert: false });

    if (error) throw new Error(error.message);

    const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(filePath);

    return {
      url: data.publicUrl,
      name: file.name,
    };
  }

  async function addEntry() {
    if (!supabase) {
      setErrorMessage("Supabase ist nicht konfiguriert.");
      return;
    }

    if (!amount || !date || !name || !enteredBy) {
      setErrorMessage("Bitte Datum, Erfasst von, Name und Betrag ausfüllen.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      let finalReceiptUrl = receiptLink.trim();
      let finalReceiptName = "";

      if (receiptFile) {
        const uploaded = await uploadReceipt(receiptFile);
        finalReceiptUrl = uploaded.url;
        finalReceiptName = uploaded.name;
      }

      const { error } = await supabase.from("expenses").insert({
        entered_by: enteredBy,
        date,
        name,
        amount: Number(amount),
        category,
        description,
        receipt_url: finalReceiptUrl || null,
        receipt_name: finalReceiptName || null,
        status: "offen",
      });

      if (error) throw new Error(error.message);

      setAmount("");
      setDescription("");
      setReceiptLink("");
      setReceiptFile(null);
      setDate(new Date().toISOString().slice(0, 10));
      if (fileInputRef.current) fileInputRef.current.value = "";

      setSuccessMessage("Spese gespeichert.");
      await loadEntries();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Fehler beim Speichern."
      );
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(entry: ExpenseRow) {
    if (!supabase) return;

    const nextStatus = entry.status === "offen" ? "bezahlt" : "offen";

    const { error } = await supabase
      .from("expenses")
      .update({ status: nextStatus })
      .eq("id", entry.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    await loadEntries();
  }

  async function deleteEntry(id: string) {
    if (!supabase) return;

    const ok = window.confirm("Diesen Eintrag wirklich löschen?");
    if (!ok) return;

    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    await loadEntries();
  }

  const monthOptions = useMemo(() => {
    return [...new Set(entries.map((entry) => monthKey(entry.date)))].sort().reverse();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchName = filterName === "alle" || entry.name === filterName;
      const matchStatus = filterStatus === "alle" || entry.status === filterStatus;
      const matchMonth = filterMonth === "alle" || monthKey(entry.date) === filterMonth;
      return matchName && matchStatus && matchMonth;
    });
  }, [entries, filterName, filterStatus, filterMonth]);

  const totals = useMemo(() => {
    const total = entries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const open = entries
      .filter((entry) => entry.status === "offen")
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const paid = entries
      .filter((entry) => entry.status === "bezahlt")
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    return { total, open, paid };
  }, [entries]);

  const summaryByPerson = useMemo(() => {
    return PEOPLE.map((person) => {
      const personEntries = entries.filter((entry) => entry.name === person);
      const total = personEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
      const open = personEntries
        .filter((entry) => entry.status === "offen")
        .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
      const paid = personEntries
        .filter((entry) => entry.status === "bezahlt")
        .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

      return {
        person,
        count: personEntries.length,
        total,
        open,
        paid,
      };
    });
  }, [entries]);

  const summaryByMonth = useMemo(() => {
    return monthOptions.map((month) => {
      const monthEntries = entries.filter((entry) => monthKey(entry.date) === month);
      const total = monthEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
      return {
        month,
        total,
        count: monthEntries.length,
      };
    });
  }, [entries, monthOptions]);

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-100 via-white to-amber-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-[2rem] border border-emerald-200 bg-white/95 p-8 shadow-xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100">
              <Receipt className="h-8 w-8 text-emerald-700" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Bürgin Ranch Spesen</h1>
            <p className="mt-2 text-sm text-slate-500">
              Bitte Zugangscode eingeben
            </p>
          </div>

          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Zugangscode"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="h-12 rounded-2xl"
            />

            <Button
              className="h-12 w-full rounded-2xl bg-emerald-600 text-base hover:bg-emerald-700"
              onClick={() => {
                if (code === ACCESS_CODE) {
                  sessionStorage.setItem("buergin-ranch-unlocked", "yes");
                  setUnlocked(true);
                } else {
                  alert("Falscher Code");
                }
              }}
            >
              Zugang öffnen
            </Button>

            <p className="text-center text-xs text-slate-400">
              Einfacher Schutz für eure Gruppe
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-amber-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="overflow-hidden rounded-[2rem] border border-emerald-200 bg-white shadow-sm">
          <div className="grid gap-6 p-6 md:grid-cols-[1.2fr_0.8fr] md:p-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1 text-sm font-medium text-emerald-800">
                <Users className="h-4 w-4" />
                Gemeinsame Online-Spesen-App
              </div>

              <div>
                <h1 className="text-4xl font-bold tracking-tight text-slate-900">
                  Bürgin Ranch Spesen
                </h1>
                <p className="mt-2 max-w-2xl text-slate-600">
                  Schöne, einfache Spesen-App für Märk, Elle, Ruth und Theo —
                  mit Beleg-Upload, Status, Monatsbericht und CSV-Export.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  className="rounded-2xl bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => exportCsv(entries)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  CSV Export
                </Button>

                <Button
                  variant="outline"
                  className="rounded-2xl"
                  onClick={() => printMonthlyReport(entries)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Monatsbericht drucken
                </Button>

                <Button
                  variant="outline"
                  className="rounded-2xl"
                  onClick={loadEntries}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Neu laden
                </Button>
              </div>

              {errorMessage ? (
                <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  <span>{errorMessage}</span>
                </div>
              ) : null}

              {successMessage ? (
                <div className="rounded-2xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                  {successMessage}
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 rounded-[1.5rem] bg-slate-50 p-4">
              <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
                <Camera className="h-5 w-5 text-amber-700" />
                <div>
                  <div className="font-medium">Beleg-Upload</div>
                  <div className="text-sm text-slate-500">
                    Bild oder PDF direkt hochladen
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
                <Clock3 className="h-5 w-5 text-red-700" />
                <div>
                  <div className="font-medium">Offen / bezahlt</div>
                  <div className="text-sm text-slate-500">
                    Mit einem Klick umschalten
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
                <FileText className="h-5 w-5 text-emerald-700" />
                <div>
                  <div className="font-medium">Monatsbericht</div>
                  <div className="text-sm text-slate-500">
                    Druckbar für die Buchhaltung
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Total Spesen"
            value={currency(totals.total)}
            icon={<Wallet className="h-5 w-5 text-emerald-700" />}
            tone="emerald"
          />
          <StatCard
            title="Noch offen"
            value={currency(totals.open)}
            icon={<Clock3 className="h-5 w-5 text-red-700" />}
            tone="red"
          />
          <StatCard
            title="Bereits bezahlt"
            value={currency(totals.paid)}
            icon={<CheckCircle2 className="h-5 w-5 text-green-700" />}
            tone="green"
          />
        </div>

        <Tabs defaultValue="erfassen" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 rounded-2xl bg-white p-1 shadow-sm md:w-[480px]">
            <TabsTrigger value="erfassen" className="rounded-xl">
              Erfassen
            </TabsTrigger>
            <TabsTrigger value="liste" className="rounded-xl">
              Liste
            </TabsTrigger>
            <TabsTrigger value="auswertung" className="rounded-xl">
              Auswertung
            </TabsTrigger>
          </TabsList>

          <TabsContent value="erfassen" className="mt-0">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <Card className="rounded-[1.75rem] border-emerald-100 shadow-sm">
                <CardHeader>
                  <CardTitle>Neue Spese erfassen</CardTitle>
                  <CardDescription>
                    Für wen die Spese ist und wer sie eingetragen hat.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Erfasst von</Label>
                      <Select value={enteredBy} onValueChange={setEnteredBy}>
                        <SelectTrigger className="rounded-2xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PEOPLE.map((person) => (
                            <SelectItem key={person} value={person}>
                              {person}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Für wen ist die Spese</Label>
                      <Select value={name} onValueChange={setName}>
                        <SelectTrigger className="rounded-2xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PEOPLE.map((person) => (
                            <SelectItem key={person} value={person}>
                              {person}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Datum</Label>
                      <Input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="rounded-2xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Betrag in CHF</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="45.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="rounded-2xl"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label>Kategorie</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="rounded-2xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Beschreibung</Label>
                    <Input
                      placeholder="z. B. Treibstoff für Traktor"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="rounded-2xl"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Beleg hochladen</Label>
                      <div className="rounded-3xl border border-dashed border-emerald-200 bg-emerald-50 p-4">
                        <Input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setReceiptFile(file);
                            if (file) setReceiptLink("");
                          }}
                          className="rounded-2xl"
                        />
                        <div className="mt-3 flex items-center gap-2 text-sm text-emerald-800">
                          <Upload className="h-4 w-4" />
                          Foto oder PDF auswählen
                        </div>
                        {receiptFile ? (
                          <div className="mt-2 text-sm text-slate-600">
                            {receiptFile.name}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Oder Beleg-Link</Label>
                      <Input
                        placeholder="Drive oder Dropbox Link"
                        value={receiptLink}
                        onChange={(e) => {
                          setReceiptLink(e.target.value);
                          if (e.target.value) {
                            setReceiptFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }
                        }}
                        className="rounded-2xl"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={addEntry}
                      disabled={loading}
                      className="rounded-2xl bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Speichern
                    </Button>

                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => {
                        setEnteredBy("Theo");
                        setName("Theo");
                        setDate(new Date().toISOString().slice(0, 10));
                        setAmount("");
                        setCategory("Treibstoff");
                        setDescription("");
                        setReceiptLink("");
                        setReceiptFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      Leeren
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[1.75rem] border-amber-100 shadow-sm">
                <CardHeader>
                  <CardTitle>Übersicht pro Person</CardTitle>
                  <CardDescription>
                    Total, offen und bezahlt auf einen Blick.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  {summaryByPerson.map((item) => (
                    <div
                      key={item.person}
                      className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="font-semibold text-slate-900">{item.person}</div>
                        <Badge variant="secondary" className="rounded-full">
                          {item.count} Belege
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="rounded-2xl bg-slate-100 p-3">
                          <div className="text-slate-500">Total</div>
                          <div className="font-semibold">{currency(item.total)}</div>
                        </div>
                        <div className="rounded-2xl bg-red-50 p-3 text-red-700">
                          <div>Offen</div>
                          <div className="font-semibold">{currency(item.open)}</div>
                        </div>
                        <div className="rounded-2xl bg-green-50 p-3 text-green-700">
                          <div>Bezahlt</div>
                          <div className="font-semibold">{currency(item.paid)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="liste" className="mt-0">
            <Card className="rounded-[1.75rem] shadow-sm">
              <CardHeader>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle>Alle Spesen</CardTitle>
                    <CardDescription>
                      Filterbar nach Person, Status und Monat.
                    </CardDescription>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <div className="w-[170px]">
                      <Select value={filterName} onValueChange={setFilterName}>
                        <SelectTrigger className="rounded-2xl">
                          <Filter className="mr-2 h-4 w-4" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="alle">Alle Personen</SelectItem>
                          {PEOPLE.map((person) => (
                            <SelectItem key={person} value={person}>
                              {person}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-[170px]">
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="rounded-2xl">
                          <Filter className="mr-2 h-4 w-4" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="alle">Alle Status</SelectItem>
                          {STATUS.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-[170px]">
                      <Select value={filterMonth} onValueChange={setFilterMonth}>
                        <SelectTrigger className="rounded-2xl">
                          <Filter className="mr-2 h-4 w-4" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="alle">Alle Monate</SelectItem>
                          {monthOptions.map((month) => (
                            <SelectItem key={month} value={month}>
                              {monthLabel(month)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Erfasst von</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Datum</TableHead>
                        <TableHead>Betrag</TableHead>
                        <TableHead>Kategorie</TableHead>
                        <TableHead>Beschreibung</TableHead>
                        <TableHead>Beleg</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aktion</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {filteredEntries.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={9}
                            className="py-12 text-center text-slate-500"
                          >
                            {loading ? "Lade Daten ..." : "Noch keine Spesen vorhanden."}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredEntries.map((entry) => (
                          <TableRow key={entry.id} className="hover:bg-slate-50">
                            <TableCell>{entry.entered_by || "-"}</TableCell>
                            <TableCell className="font-medium">{entry.name}</TableCell>
                            <TableCell>{formatDate(entry.date)}</TableCell>
                            <TableCell>{currency(Number(entry.amount || 0))}</TableCell>
                            <TableCell>{entry.category}</TableCell>
                            <TableCell>{entry.description || "-"}</TableCell>
                            <TableCell>
                              {entry.receipt_url ? (
                                entry.receipt_name?.toLowerCase().endsWith(".pdf") ? (
                                  <a
                                    href={entry.receipt_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-emerald-700 underline"
                                  >
                                    <FileText className="h-4 w-4" />
                                    Öffnen
                                  </a>
                                ) : (
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <button className="inline-flex items-center gap-1 text-emerald-700 underline">
                                        <FileImage className="h-4 w-4" />
                                        Öffnen
                                      </button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-3xl rounded-3xl">
                                      <DialogHeader>
                                        <DialogTitle>
                                          {entry.receipt_name || "Beleg"}
                                        </DialogTitle>
                                      </DialogHeader>
                                      <img
                                        src={entry.receipt_url}
                                        alt="Beleg"
                                        className="max-h-[70vh] rounded-2xl border object-contain"
                                      />
                                    </DialogContent>
                                  </Dialog>
                                )
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <button
                                onClick={() => toggleStatus(entry)}
                                className={`rounded-full px-3 py-1 text-sm font-medium ${
                                  entry.status === "bezahlt"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {entry.status}
                              </button>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteEntry(entry.id)}
                              >
                                <Trash2 className="h-4 w-4 text-slate-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="auswertung" className="mt-0">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="rounded-[1.75rem] shadow-sm">
                <CardHeader>
                  <CardTitle>Auswertung pro Person</CardTitle>
                  <CardDescription>
                    Ideal für Rückzahlungen und Überblick.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  {summaryByPerson.map((item) => (
                    <div
                      key={item.person}
                      className="flex items-center justify-between rounded-3xl border bg-white p-4"
                    >
                      <div>
                        <div className="font-semibold">{item.person}</div>
                        <div className="text-sm text-slate-500">
                          {item.count} Belege
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{currency(item.total)}</div>
                        <div className="text-sm text-slate-500">
                          Offen {currency(item.open)} · Bezahlt {currency(item.paid)}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="rounded-[1.75rem] shadow-sm">
                <CardHeader>
                  <CardTitle>Auswertung pro Monat</CardTitle>
                  <CardDescription>
                    Praktisch für Buchhaltung und Jahresübersicht.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  {summaryByMonth.length === 0 ? (
                    <div className="rounded-3xl border bg-white p-6 text-sm text-slate-500">
                      Noch keine Monatsdaten vorhanden.
                    </div>
                  ) : (
                    summaryByMonth.map((item) => (
                      <div
                        key={item.month}
                        className="flex items-center justify-between rounded-3xl border bg-white p-4"
                      >
                        <div>
                          <div className="font-semibold">{monthLabel(item.month)}</div>
                          <div className="text-sm text-slate-500">
                            {item.count} Belege
                          </div>
                        </div>
                        <div className="font-semibold">{currency(item.total)}</div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}