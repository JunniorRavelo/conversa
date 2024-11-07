'use client'

import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { MapPin, Shield, Users, Coins, Mic, Send } from 'lucide-react'
import Image from 'next/image'

export function VoiceInterface() {
  const [isListening, setIsListening] = useState(false)
  const [voiceText, setVoiceText] = useState('')
  const [hasPermission, setHasPermission] = useState(false)
  const [inputText, setInputText] = useState('')
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => setHasPermission(true))
      .catch(() => setHasPermission(false))
  }, [])

  useEffect(() => {
    if (!recognitionRef.current && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.lang = 'es-ES'
      recognitionRef.current.continuous = true

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('')
        setVoiceText(transcript)
        console.log("Texto reconocido:", transcript) // Imprime el texto en consola
      }

      recognitionRef.current.onerror = (event) => {
        console.error("Error en el reconocimiento de voz:", event.error)
        setIsListening(false)
      }
    }
  }, [])

  const toggleListening = () => {
    if (!hasPermission) {
      alert('Por favor permite el acceso al micrófono para usar esta función')
      return
    }

    if (isListening) {
      recognitionRef.current?.stop()
    } else {
      setVoiceText('') // Limpia el texto al iniciar una nueva grabación
      recognitionRef.current?.start()
    }
    setIsListening(!isListening)
  }

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'es-ES'
      window.speechSynthesis.cancel() // Cancelar cualquier síntesis en curso
      window.speechSynthesis.speak(utterance)
    } else {
      console.error("La síntesis de voz no es compatible con este navegador.")
    }
  }

  const handleSendText = () => {
    if (inputText.trim()) {
      speakText(inputText)
      setInputText('')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 via-purple-600 to-purple-700">
      {/* Header */}
      <header className="p-4 flex items-center justify-center gap-4">
        <Image
          src="/placeholder.svg"
          alt="Robot Logo"
          width={60}
          height={60}
          className="rounded-full"
        />
        <div className="text-white text-2xl font-bold">ConVersa</div>
      </header>

      {/* Main Content */}
      <main className="px-4 pb-20">
        {/* Navigation Tabs */}
        <Tabs defaultValue="resumen" className="w-full mb-6">
          <TabsList className="w-full bg-white/20 text-white">
            <TabsTrigger value="resumen" className="flex-1">Resumen</TabsTrigger>
            <TabsTrigger value="utilidades" className="flex-1">Utilidades</TabsTrigger>
            <TabsTrigger value="mapa" className="flex-1">Mapa</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Widgets Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="p-4 bg-purple-500/80 text-white cursor-pointer hover:bg-purple-600/80 transition-colors" onClick={() => speakText('Maps')}>
            <div className="flex flex-col items-center text-center gap-2">
              <MapPin className="w-8 h-8" />
              <h3 className="font-bold">Maps</h3>
              <p className="text-sm opacity-90">Ubicación actual</p>
            </div>
          </Card>

          <Card className="p-4 bg-purple-500/80 text-white cursor-pointer hover:bg-purple-600/80 transition-colors" onClick={() => speakText('SISBEN')}>
            <div className="flex flex-col items-center text-center gap-2">
              <Users className="w-8 h-8" />
              <h3 className="font-bold">SISBEN</h3>
              <p className="text-sm opacity-90">Consulta tu estado</p>
            </div>
          </Card>

          <Card className="p-4 bg-purple-500/80 text-white cursor-pointer hover:bg-purple-600/80 transition-colors" onClick={() => speakText('Zona')}>
            <div className="flex flex-col items-center text-center gap-2">
              <Shield className="w-8 h-8" />
              <h3 className="font-bold">Zona</h3>
              <p className="text-sm opacity-90">Área segura</p>
            </div>
          </Card>

          <Card className="p-4 bg-purple-500/80 text-white cursor-pointer hover:bg-purple-600/80 transition-colors" onClick={() => speakText('Economía')}>
            <div className="flex flex-col items-center text-center gap-2">
              <Coins className="w-8 h-8" />
              <h3 className="font-bold">Economía</h3>
              <p className="text-sm opacity-90">Indicadores</p>
            </div>
          </Card>
        </div>

        {/* Summary Card */}
        <Card className="p-4 mb-6 bg-white">
          <h2 className="text-lg font-bold text-purple-600 mb-2">Resumen General</h2>
          <p className="text-sm text-gray-700">
            Condiciones favorables en la ciudad. Zona segura, tráfico menor al promedio, buena calidad del aire. Ideal para actividades al aire libre.
          </p>
        </Card>

        {/* Text to Speech Input */}
        <div className="flex gap-2 mb-6">
          <Input
            type="text"
            placeholder="Escribe algo para reproducir..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-grow bg-white text-gray-900 placeholder-gray-500"
          />
          <Button onClick={handleSendText} className="bg-purple-500 hover:bg-purple-600">
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Voice to Text Result */}
        {voiceText && (
          <Card className="p-4 mb-6 bg-white">
            <h3 className="font-bold text-purple-600 mb-2">Texto reconocido:</h3>
            <p>{voiceText}</p>
          </Card>
        )}

        {/* Microphone Section */}
        <Card className="p-4 mb-6 bg-white">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-purple-600">Asistente de Voz</h3>
            <Button
              onClick={toggleListening}
              className={`w-12 h-12 rounded-full ${
                isListening ? 'animate-pulse bg-red-500 hover:bg-red-600' : 'bg-purple-500 hover:bg-purple-600'
              }`}
            >
              <Mic className="w-6 h-6 text-white" />
            </Button>
          </div>
          <p className="text-sm text-gray-700 mt-2">
            Haz clic en el botón para iniciar o detener la grabación.
          </p>
        </Card>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 text-center p-4 text-xs text-white bg-purple-800">
        © 2024. Todos los datos son extraídos de www.datos.gov.co
      </footer>
    </div>
  )
}
