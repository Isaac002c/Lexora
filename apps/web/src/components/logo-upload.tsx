"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function LogoUpload() { const [file, setFile] = useState<File>(); const [saving, setSaving] = useState(false); const router = useRouter(); async function upload() { if (!file) return; setSaving(true); const data = new FormData(); data.set("file", file); const response = await fetch("/api/v1/admin/logo", { method: "POST", body: data }); setSaving(false); if (!response.ok) return window.alert("Não foi possível atualizar a logo."); router.refresh(); } return <div className="flex items-center gap-2"><Input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(event) => setFile(event.target.files?.[0])} /><Button disabled={!file || saving} onClick={upload}>{saving ? "Enviando..." : "Atualizar logo"}</Button></div>; }
