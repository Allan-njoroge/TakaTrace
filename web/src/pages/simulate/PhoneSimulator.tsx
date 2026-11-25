import { useState } from "react";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useDemoPickers, usePhoneSms, useSendInboundSms, useUssdSession, type UssdResponse } from "../../hooks/usePhoneSimulator";
import { config } from "../../config";
import { formatDateTime } from "../../lib/format";

type Mode = "messages" | "ussd";

export default function PhoneSimulatorPage() {
  useDocumentTitle("Phone simulator");
  const pickers = useDemoPickers();
  const [phone, setPhone] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("messages");

  const selectedPicker = pickers.data?.find((p) => p.phone === phone);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold text-ink-900">Phone simulator</h1>

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <Select label="Choose picker" value={phone ?? ""} onChange={(e) => setPhone(e.target.value || null)} className="w-64">
          <option value="">Select a picker…</option>
          {pickers.data?.map((picker) => (
            <option key={picker.id} value={picker.phone ?? picker.phoneMasked}>
              {picker.code} · {picker.phoneMasked}
            </option>
          ))}
        </Select>

        <div className="flex gap-2">
          <Button variant={mode === "messages" ? "primary" : "secondary"} icon={null} onClick={() => setMode("messages")}>
            Messages
          </Button>
          <Button variant={mode === "ussd" ? "primary" : "secondary"} icon={null} onClick={() => setMode("ussd")}>
            Dial USSD
          </Button>
        </div>
      </div>

      {!phone ? (
        <p className="mt-8 text-sm text-ink-600">Choose a picker to see their phone.</p>
      ) : (
        <div className="mt-8 flex justify-center">
          <PhoneFrame>{mode === "messages" ? <MessagesMode phone={phone} /> : <UssdMode phone={phone} pickerCode={selectedPicker?.code} />}</PhoneFrame>
        </div>
      )}
    </div>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  const [time] = useState(() => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));

  return (
    <div className="flex h-[640px] w-[340px] flex-col overflow-hidden rounded-[32px] border-4 border-ink-900 bg-cream-100">
      <div className="flex justify-between px-4 pt-3 text-xs text-ink-900">
        <span>{time}</span>
        <span>▮▮▮ 78%</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4">{children}</div>
    </div>
  );
}

function MessagesMode({ phone }: { phone: string }) {
  const sms = usePhoneSms(phone);
  const sendInbound = useSendInboundSms(phone);
  const [reply, setReply] = useState("");

  return (
    <div className="flex h-full flex-col">
      <p className="text-sm font-semibold text-ink-900">Messages</p>
      <div className="mt-3 flex-1 space-y-3 overflow-y-auto">
        {sms.data?.map((message) => (
          <div key={message.id} className={message.direction === "OUTBOUND" ? "" : "flex justify-end"}>
            <div
              className={`max-w-[85%] rounded-card px-3 py-2 text-xs ${
                message.direction === "OUTBOUND" ? "bg-paper text-ink-900" : "bg-forest-700 text-white"
              }`}
            >
              {message.direction === "OUTBOUND" && <p className="font-semibold">TakaTrace</p>}
              <p className="mt-0.5">{message.text}</p>
              <p className="mt-1 text-[10px] opacity-70">
                {formatDateTime(message.at)} · {message.status.toLowerCase()}
              </p>
            </div>
          </div>
        ))}
        {sms.data?.length === 0 && <p className="text-xs text-ink-600">No messages yet.</p>}
      </div>
      <div className="mt-3 flex gap-2">
        <Input
          label="Reply as picker"
          className="flex-1"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="DISPUTE TT-NRB01-000042 wrong weight"
        />
        <Button
          icon={null}
          className="self-end"
          disabled={!reply.trim()}
          loading={sendInbound.isPending}
          onClick={async () => {
            await sendInbound.mutateAsync(reply);
            setReply("");
          }}
        >
          Send
        </Button>
      </div>
    </div>
  );
}

function UssdMode({ phone, pickerCode }: { phone: string; pickerCode?: string }) {
  const session = useUssdSession();
  const [sessionId] = useState(() => crypto.randomUUID());
  const [text, setText] = useState("");
  const [response, setResponse] = useState<UssdResponse | null>(null);
  const [input, setInput] = useState("");

  async function call() {
    const result = await session.mutateAsync({ sessionId, phoneNumber: phone, text: "" });
    setText("");
    setResponse(result);
  }

  async function sendInput() {
    const nextText = text ? `${text}*${input}` : input;
    const result = await session.mutateAsync({ sessionId, phoneNumber: phone, text: nextText });
    setText(nextText);
    setInput("");
    setResponse(result);
  }

  return (
    <div className="flex h-full flex-col">
      <p className="text-sm font-semibold text-ink-900">Dial USSD</p>
      <p className="mt-1 text-xs text-ink-600">{pickerCode}</p>

      {!response ? (
        <div className="mt-4 flex flex-col items-center gap-4">
          <p className="rounded-input bg-paper px-4 py-3 font-mono text-lg text-ink-900">{config.ussdCode}</p>
          <Button onClick={() => void call()} loading={session.isPending}>
            Call
          </Button>
        </div>
      ) : (
        <div className="mt-4 flex flex-1 flex-col rounded-card bg-paper p-4">
          <p className="flex-1 whitespace-pre-wrap text-sm text-ink-900">{response.text}</p>
          {response.mode === "CON" ? (
            <div className="mt-3 flex gap-2">
              <Input label="Your input" className="flex-1" value={input} onChange={(e) => setInput(e.target.value)} />
              <Button icon={null} loading={session.isPending} disabled={!input} onClick={() => void sendInput()}>
                Send
              </Button>
            </div>
          ) : (
            <Button
              className="mt-3 self-start"
              icon={null}
              onClick={() => {
                setResponse(null);
                setText("");
              }}
            >
              OK
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
