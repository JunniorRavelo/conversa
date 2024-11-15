'use client'

import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {  Shield, Mic,Car } from 'lucide-react'
import { GoogleMap, LoadScript, Circle } from '@react-google-maps/api';
import Image from 'next/image'

export function VoiceInterface() {

  const url = "https://conversa-api.dyamdev.com";
  //const url = "http://127.0.0.1:8000";

  const mapContainerStyle = {
    width: '100%',
    height: '400px',
    borderRadius: '16px', // Add rounded corners to the map
    overflow: 'hidden',
  };

 

  interface Ubicacion {
    latitud?: string; // optional in case latitud or longitud might be missing
    longitud?: string;
  }

  const recognitionRef = useRef<InstanceType<typeof window.SpeechRecognition> | InstanceType<typeof window.webkitSpeechRecognition> | null>(null);

  const [activeTab, setActiveTab] = useState('Resumen');
  const [isListening, setIsListening] = useState(false)
  const [voiceText, setVoiceText] = useState('')
  const [hasPermission, setHasPermission] = useState(false)
  const [miubicacion, setMiubicacion] = useState({ latitud: 0, longitud: 0});
  const [zonasegura, setZonasegura] = useState("Zona segura");
  const [miclima, setMiclima] = useState("");
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [mensaje, setMensaje] = useState(''); // Nuevo estado para almacenar el mensaje

  const [center, setCenter] = useState({
    lat: 7.12539,  // Latitud de ejemplo
    lng: -73.1198, // Longitud de ejemplo
  });

  //inicia permisos de microfono, sonido ubicacion
  useEffect(() => {

    miUbicacionCords();

    // requerir microfono
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => setHasPermission(true))
      .catch(() => setHasPermission(false));
  
    if (typeof window !== "undefined" && !recognitionRef.current) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.lang = 'es-ES';
        recognitionRef.current.continuous = true;
  
        // Define the onresult handler
        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = Array.from(event.results)
            .map(result => result[0])
            .map(result => result.transcript)
            .join('');
  
          setVoiceText(transcript);
          setMensaje(transcript); 
        };
  
        recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error("Error en el reconocimiento de voz:", event.error);
          setIsListening(false);
        };
      }
    }
  }, []);

  
  //si la ubicacion existe hace las peticiones de la info cercana
  useEffect(() => {
    if (miubicacion.latitud !== 0 && miubicacion.longitud !== 0) {
      fetchMapa();
      fetchMiClima();
      fetchZonaSegura();
    }
  }, [miubicacion]);

  useEffect(() => {
    if (miubicacion.latitud !== 0 && miubicacion.longitud !== 0 && mensaje) {
      fetchMicrofono(mensaje, miubicacion);
    }
  }, [miubicacion, mensaje]);
  
  
  //microno, procesa todas la peticiones realizadas atravez del micro
  async function fetchMicrofono(mensaje: string, coords: { latitud: number; longitud: number }) {

    try {
      const response = await fetch(url+'/api/microfono', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mensaje,
          latitud: coords.latitud,
          longitud: coords.longitud,
        }),
      });
  
      if (!response.ok) {
        throw new Error('Error en la solicitud al servidor');
      }
      const data = await response.json();
      if(data.tipo === "zona segura"){
        fetchZonaSegura();
      }

      console.log('ubicacion',data.tipo );
      if(data.tipo === "hospital"){
        const ubicacion = [{
          latitud:data.datos.ubicacion.latitud,
          longitud: data.datos.ubicacion.longitud,
        }];

       
        setUbicaciones(ubicacion);
        setCenter({
          lat: coords.latitud,
          lng: coords.longitud,
        });
        setActiveTab('Mapa');
      }
     
      speakText(data.respuesta);
      return data.respuesta; // Retorna el número si lo necesitas para otras funciones
  
    } catch (error) {
      console.error('Error:', error);
    }
  }
  

  //toma las cordenadas de mi ubicacion y las guarda en una variable global
  async function miUbicacionCords() {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitud = position.coords.latitude;
        const longitud = position.coords.longitude;
        const coords = { latitud, longitud };

        if (position.coords.latitude !== 0 && position.coords.longitude !== 0) {
          setMiubicacion(coords);
        }
      },
      (error) => {
        console.error('Error al obtener la ubicación:', error);
      }
    );
  }

  //peticion de zona segura basada en mi ubicacion
  async function fetchZonaSegura() {
    try {
      const response = await fetch(url+'/api/zonasegura', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify( miubicacion ), // Enviar latitud y longitud en el cuerpo de la solicitud
      });
      if (!response.ok) {
        throw new Error('Error al obtener la zona de seguridad');
      }
      const data = await response.json();
      setZonasegura(data.respuesta); // Asume que setZonasegura actualiza el estado con la respuesta
    } catch (error) {
      console.error('Error:', error);
    }
  }

  //peticion del clima en mi ubicacion actual
  async function fetchMiClima() {
    console.log('fetchMiClima ',miubicacion);
    try {
      const response = await fetch(url+'/api/miclima', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify( miubicacion ), // Enviar latitud y longitud en el cuerpo de la solicitud
      });
      if (!response.ok) {
        throw new Error('Error al obtener clima');
      }
      const data = await response.json();
      setMiclima(data.respuesta); // Asume que setZonasegura actualiza el estado con la respuesta
    } catch (error) {
      console.error('Error:', error);
    }
  }
  
  //peticion de zonas calientes inseguras para el mapa
  async function fetchMapa() {
    const response = await fetch(url+'/api/mapa');
    const data = await response.json();
    setUbicaciones(data);
  }

 
  //funcion que inicializa el microfono
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

  //reproduce en voz alta un texto
  const speakText = async (text: string) => {
    if ('speechSynthesis' in window) {
      // Espera hasta que `speechSynthesis` esté listo
      while (window.speechSynthesis.speaking) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      // Cancela cualquier síntesis previa y crea un nuevo utterance
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'es-ES'
      
      // Inicia la síntesis
      window.speechSynthesis.speak(utterance)
    } else {
      console.error("La síntesis de voz no es compatible con este navegador.")
    }
  }


  return (
    <div className="min-h-screen" style={{ maxWidth: '412px', margin: 'auto' }}>
      {/* Header */}
      
      <header className="bg-gradient-to-b from-blue-500  to-purple-700 p-6">
        <div className="flex items-center justify-center gap-4">
        <Image
          src="/images/icon.png"
          alt="Robot Logo"
          width={60}
          height={60}
          className="rounded-full"
        />
            <div style={{ position: 'relative', width: '150px', height: '60px' }}>
        <Image
          src="/images/mintic.png"
          alt="Robot mintic"
          layout="fill"
          objectFit="contain"  // Mantiene la imagen dentro del contenedor sin distorsión
        />
      </div>
        </div>
        <h1 className="text-white text-center text-3xl font-bold mt-4">ConVersa</h1>
      </header>
    

      {/* Main Content */}
      <main className="px-4 pb-20">
        {/* Navigation Tabs */}

        <div className="bg-white rounded-full p-2 shadow-lg mb-6 mt-2">
          <div className="flex gap-2">
            {['Resumen', 'Utilidades', 'Mapa'].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);  // Primera acción
                  speakText(tab);  // Segunda acción
                }}
                className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-colors
                  ${activeTab === tab 
                    ? 'bg-purple-500 text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "Resumen" && 
          <div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-blue-500 to-purple-500 p-4 rounded-xl cursor-pointer "  onClick={() => speakText('zona segura')}>
                <div className="flex flex-col items-center text-white">
                  <Shield className="w-6 h-6 mb-2" />
                  <h3 className="text-lg font-bold">{zonasegura}</h3>
                  <p className="text-sm opacity-80">Área comprobada</p>
                </div>
              </Card>
              <Card className="bg-gradient-to-br from-blue-500 to-purple-500 p-4 rounded-xl cursor-pointer "  onClick={() => speakText(miclima)}>
                <div className="flex flex-col items-center text-white">
                  <Car className="w-6 h-6 mb-2" />
                  <h3 className="text-lg font-bold">Clima</h3>
                  <p className="text-sm opacity-80">{miclima}</p>
                </div>
              </Card>
            </div>

            <Card className="p-4 mb-6 bg-white cursor-pointer" onClick={() => speakText('Las condiciones donde estas es '+ zonasegura + ' y '+miclima)}>
              <h2 className="text-lg font-bold text-purple-600 mb-2">Resumen General</h2>
              <p className="text-sm text-gray-700">
                Las condiciones donde estas es {zonasegura} y {miclima}.
              </p>
            </Card>
          </div>
        }


        {activeTab === "Utilidades" && 
          <div>
            <div className="grid grid-cols-2 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-blue-500 to-purple-500 p-4 rounded-xl cursor-pointer" onClick={() => {
              const now = new Date();
              const fecha = now.toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
              });
              const hora = now.toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit'
              });
              
              // Determina si es de la mañana o de la tarde
              const periodo = now.getHours() < 12 ? 'de la mañana' : 'de la tarde';
              
              // Genera el texto a decir
              const texto = `Fecha y hora: ${fecha} ${hora} ${periodo}`;
              
              // Llama a la función para hablar el texto
              speakText(texto);
          }}>
                <div className="flex flex-col items-center text-white">
                  <Shield className="w-6 h-6 mb-2" />
                  <h3 className="text-lg font-bold">Fecha y hora</h3>
                  <p className="text-sm opacity-80 text-center">
                  {new Date().toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}{' '}
                  {new Date().toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  </p>
                </div>
              </Card>
              <Card className="bg-gradient-to-br from-blue-500 to-purple-500 p-4 rounded-xl cursor-pointer "  onClick={() => speakText(miclima)}>
                <div className="flex flex-col items-center text-white">
                  <Car className="w-6 h-6 mb-2" />
                  <h3 className="text-lg font-bold">Clima</h3>
                  <p className="text-sm opacity-80">{miclima}</p>
                </div>
              </Card>
            </div>
          </div>
        }


      <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}>
        {activeTab === "Mapa" && 
          <div className="mb-2" style={mapContainerStyle} >
              <GoogleMap mapContainerStyle={mapContainerStyle} center={center} zoom={14}>

              {ubicaciones.map((ubicacion, index) => (
                <Circle
                key={index}
                center={{
                  lat: parseFloat(ubicacion?.latitud ?? "0"),
                  lng: parseFloat(ubicacion?.longitud ?? "0")
                }}
                radius={200} // Radio del círculo en metros (ajusta según lo necesario)
                options={{
                  fillColor: "red",
                  fillOpacity: 0.2, // Opacidad baja para un efecto difuminado
                  strokeColor: "transparent", // Sin borde
                }}
              />
              ))}

               
              </GoogleMap>
          </div>
        } 
         </LoadScript>
        

        
       
        

      
        {/* Voice to Text Result */}
        {voiceText && (
          <Card className="p-4 mb-6 bg-white">
            <h3 className="font-bold text-purple-600 mb-2">Texto reconocido:</h3>
            <p>{voiceText}</p>
          </Card>
        )}

        {/* Microphone Section */}
        <div className="flex flex-col items-center">
            <Button
              onClick={toggleListening}
              className={`w-16 h-16 rounded-full ${
                isListening ? 'animate-pulse bg-red-500 hover:bg-red-600' : 'bg-purple-500 hover:bg-purple-600'
              }`}
            >
              <Mic className="w-6 h-6 text-white" />
            </Button>
          <p className="mt-2 text-purple-500 font-medium">
            Toca para hablar
          </p>
        </div>

      
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 text-center p-4 text-xs text-white bg-purple-800">
        © 2024. Todos los datos son extraídos de www.datos.gov.co
      </footer>
    </div>
  )
}
