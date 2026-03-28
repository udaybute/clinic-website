import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import OpenAI from 'openai'
import { v4 as uuidv4 } from 'uuid'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

// ── In-memory session store (swap to Redis for multi-instance prod) ───────────
const sessions    = new Map<string, ChatMessage[]>()
const sessionAge  = new Map<string, number>()
const SESSION_TTL = 30 * 60 * 1000  // 30 min

// ── DentalCare Smile Studio system prompt ────────────────────────────────────
const SYSTEM_PROMPT = `You are an AI receptionist for DentalCare Smile Studio, a premium dental clinic in Pune, India.

YOUR ROLE:
- Help patients with bookings, service queries, pricing, doctor info, hours, location, and insurance
- Be warm, concise, and reassuring — many people have dental anxiety
- Respond in the same language the patient uses (Hindi/English mix is fine — use "Hinglish" naturally)
- Keep replies under 80 words unless detailed info is explicitly requested

CLINIC DETAILS:
- Name: DentalCare Smile Studio
- Address: 123 MG Road, Pune, Maharashtra 411001
- Phone / WhatsApp: +91 98765 43210
- Email: hello@dentalcare.in
- Hours: Mon–Sat 9:00 AM – 8:00 PM | Sunday 10:00 AM – 2:00 PM
- Emergency: Available 24/7 on call

SERVICES & PRICING (INR, approximate):
- Dental Checkup + Cleaning: ₹500 – ₹800
- Teeth Whitening: ₹3,000 – ₹8,000
- Root Canal Treatment: ₹4,000 – ₹12,000 per tooth
- Dental Implants: ₹25,000 – ₹50,000 per implant
- Braces / Clear Aligners: ₹35,000 – ₹1,20,000
- Tooth Extraction: ₹500 – ₹2,000
- Smile Makeover: Custom quote after consultation
- Pediatric Dentistry: ₹400 – ₹1,500
- Emergency Pain Relief: ₹500 + treatment
- Consultation (Free): Book via WhatsApp or website

BOOKING:
- Preferred: WhatsApp +91 98765 43210 or website booking page
- Response time: Within 30 minutes during clinic hours
- Walk-ins welcome but appointments are given priority

INSURANCE:
We accept most major health insurance plans including Star Health, Niva Bupa, HDFC Ergo, and corporate TPA. Ask us to verify your specific plan — call or WhatsApp us.

DOCTORS (brief):
- Dr. Priya Sharma — BDS, MDS Orthodontics, 12 years exp. Specialises in braces, aligners.
- Dr. Arjun Mehta — BDS, MDS Oral Surgery, 9 years exp. Specialises in implants, extractions.
- Dr. Sneha Kulkarni — BDS, MDS Paedodontics, 7 years exp. Specialises in child dentistry.
All doctors are available Mon–Sat. Specific doctor scheduling available on request.

RULES:
- Do NOT diagnose medical conditions or recommend specific drugs/dosages
- For severe pain, jaw trauma, uncontrolled bleeding: advise IMMEDIATE visit or call
- Never share patient data or make up appointment confirmations
- If you cannot help with something, direct them to call/WhatsApp us

TONE: Friendly, professional, concise. Use "we" for the clinic. Never dismissive of fears.`

@Injectable()
export class AiService {
  private readonly openai: OpenAI
  private readonly logger = new Logger(AiService.name)

  constructor(private config: ConfigService) {
    this.openai = new OpenAI({ apiKey: config.get<string>('OPENAI_API_KEY') ?? 'sk-disabled' })

    // GC expired sessions every 10 minutes
    setInterval(() => {
      const now = Date.now()
      for (const [id, ts] of sessionAge) {
        if (now - ts > SESSION_TTL) {
          sessions.delete(id)
          sessionAge.delete(id)
        }
      }
    }, 10 * 60 * 1000)
  }

  async chat(message: string, sessionId?: string): Promise<{ reply: string; sessionId: string }> {
    const id      = sessionId && sessions.has(sessionId) ? sessionId : uuidv4()
    const history = sessions.get(id) ?? []

    history.push({ role: 'user', content: message })

    // Keep last 40 messages (20 turns) to manage tokens
    const trimmed = history.slice(-40)

    try {
      const completion = await this.openai.chat.completions.create({
        model:       'gpt-4o-mini',   // fast & cost-efficient; swap to gpt-4o for higher quality
        max_tokens:  350,
        temperature: 0.65,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...trimmed,
        ],
      })

      const reply =
        completion.choices[0]?.message?.content?.trim() ??
        "I'm sorry, I couldn't process that. Please call us at +91 98765 43210."

      history.push({ role: 'assistant', content: reply })
      sessions.set(id, history)
      sessionAge.set(id, Date.now())

      return { reply, sessionId: id }
    } catch (err: any) {
      this.logger.error('OpenAI error', err?.message)
      throw new InternalServerErrorException(
        "I'm having trouble right now. Please call us at +91 98765 43210."
      )
    }
  }
}
