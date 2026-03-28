"use client"

import { useState } from "react"
import API from "@/lib/api"

export default function Chatbot() {

 const [message,setMessage] = useState("")
 const [chat,setChat] = useState<any[]>([])

 const sendMessage = async () => {

  const res = await API.post("/ai/chat", {
   message
  })

  setChat([...chat,
   { role:"user", content:message },
   { role:"ai", content:res.data.reply }
  ])

  setMessage("")
 }

 return (
  <div className="fixed bottom-6 right-6 w-80 bg-white border p-4">

   {chat.map((c,i) => (
    <p key={i}>
     <b>{c.role}:</b> {c.content}
    </p>
   ))}

   <input
    value={message}
    onChange={(e)=>setMessage(e.target.value)}
   />

   <button onClick={sendMessage}>
    Send
   </button>

  </div>
 )
}