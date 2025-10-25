
'use client'

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useFirebase } from '@/firebase/client-provider';
import { doc, getDoc, updateDoc, collection, addDoc, onSnapshot, setDoc, query, orderBy, Timestamp } from 'firebase/firestore';
import { Button } from './ui/button';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Send, MessageSquare, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from '@/lib/utils';

// Polyfill for WebRTC
import 'webrtc-adapter';

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

interface ChatMessage {
    id: string;
    text: string;
    senderId: string;
    timestamp: Timestamp;
}

export default function VideoCall() {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callStatus, setCallStatus] = useState('Connecting...');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [participants, setParticipants] = useState({ patient: 'Patient', doctor: 'Doctor' });


  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);


  const params = useParams();
  const callId = params.id as string;
  const { db, user } = useFirebase();
  const { toast } = useToast();

  useEffect(() => {
    if (!db || !user || !callId) return;

    // Fetch participant names
    const fetchParticipantNames = async () => {
        const callDocRef = doc(db, 'calls', callId);
        const callSnap = await getDoc(callDocRef);
        if(callSnap.exists()){
            const callData = callSnap.data();
            // Assuming callData contains patientId and doctorId
            // You would fetch the names from your users/doctors collections
            // For now, we'll use placeholder names based on who initiated the call
            setParticipants({ patient: 'Patient Name', doctor: 'Dr. Name' });
        }
    }
    fetchParticipantNames();

    const setupWebRTC = async () => {
      pc.current = new RTCPeerConnection(servers);

      // Get local media
      const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
      localStream.getTracks().forEach((track) => {
        pc.current?.addTrack(track, localStream);
      });

      // Handle remote stream
      pc.current.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setCallStatus('Connected');
          // Start timer when connected
           timerIntervalRef.current = setInterval(() => {
             setCallDuration(prev => prev + 1);
          }, 1000);
        }
      };
      
      pc.current.onconnectionstatechange = () => {
        if (pc.current?.connectionState === 'disconnected' || pc.current?.connectionState === 'closed' || pc.current?.connectionState === 'failed') {
            hangUp();
        }
      };


      const callDoc = doc(db, 'calls', callId);
      const offerCandidates = collection(callDoc, 'offerCandidates');
      const answerCandidates = collection(callDoc, 'answerCandidates');

      pc.current.onicecandidate = (event) => {
        event.candidate && addDoc(offerCandidates, event.candidate.toJSON());
      };

      // Create offer
      const offerDescription = await pc.current.createOffer();
      await pc.current.setLocalDescription(offerDescription);

      const offer = {
        sdp: offerDescription.sdp,
        type: offerDescription.type,
      };

      await setDoc(callDoc, { offer }, { merge: true });

      // Listen for answer
      const unsubCall = onSnapshot(callDoc, (snapshot) => {
        const data = snapshot.data();
        if (!pc.current?.currentRemoteDescription && data?.answer) {
          const answerDescription = new RTCSessionDescription(data.answer);
          pc.current?.setRemoteDescription(answerDescription);
        }
      });

      // Listen for ICE candidates
      const unsubAnswerCandidates = onSnapshot(answerCandidates, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const candidate = new RTCIceCandidate(change.doc.data());
            pc.current?.addIceCandidate(candidate);
          }
        });
      });
      
      // Listen for Chat Messages
      const messagesRef = collection(db, 'calls', callId, 'messages');
      const q = query(messagesRef, orderBy('timestamp', 'asc'));
      const unsubMessages = onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
        setChatMessages(messages);
      });

      return () => {
          unsubCall();
          unsubAnswerCandidates();
          unsubMessages();
      }
    };

    const cleanup = setupWebRTC().catch(e => {
        console.error("WebRTC Setup failed:", e)
        toast({variant: 'destructive', title: "Video Call Failed", description: "Could not initialize video call. Please check camera/microphone permissions."})
    });

    return () => {
        cleanup.then(unsub => {
            if(unsub) unsub();
        });
        hangUp();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId, db, user, toast]);

  const hangUp = () => {
    if (pc.current) {
        pc.current.getSenders().forEach(sender => {
            if (sender.track) {
                sender.track.stop();
            }
        });
        pc.current.close();
    }

    if (localVideoRef.current && localVideoRef.current.srcObject) {
        (localVideoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
    }

    if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
        (remoteVideoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
    }

    setCallStatus('Call Ended');
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  };


  const toggleMute = () => {
    if (localVideoRef.current && localVideoRef.current.srcObject) {
       const stream = localVideoRef.current.srcObject as MediaStream;
       stream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
       setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localVideoRef.current && localVideoRef.current.srcObject) {
        const stream = localVideoRef.current.srcObject as MediaStream;
        stream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
        setIsVideoOff(!isVideoOff);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !user || !db || !callId) return;
    setIsSending(true);
    const messagesRef = collection(db, 'calls', callId, 'messages');
    try {
      await addDoc(messagesRef, {
        text: chatInput,
        senderId: user.uid,
        timestamp: serverTimestamp(),
      });
      setChatInput('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ variant: 'destructive', title: 'Message Failed' });
    } finally {
      setIsSending(false);
    }
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }

  return (
    <div className="w-full h-screen bg-gray-900 text-white flex flex-col relative">
      {/* Status Bar */}
      <div className="absolute top-4 left-4 z-20 bg-black/50 p-2 rounded-lg text-sm font-medium flex items-center gap-2">
        <span className={cn("w-2 h-2 rounded-full", callStatus === 'Connected' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500')}/>
        {callStatus} {callStatus === 'Connected' && `(${formatTime(callDuration)})`}
      </div>

      {/* Participant Info */}
       <div className="absolute top-4 right-4 z-20 space-y-2 text-right">
            <div className="bg-black/50 p-2 rounded-lg">
                <p className="text-xs text-gray-300">Patient</p>
                <p className="font-semibold">{participants.patient}</p>
            </div>
            <div className="bg-black/50 p-2 rounded-lg">
                <p className="text-xs text-gray-300">Doctor</p>
                <p className="font-semibold">{participants.doctor}</p>
            </div>
       </div>

      {/* Main Video Area */}
      <div className="flex-1 relative overflow-hidden">
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        <AnimatePresence>
            {callStatus !== 'Connected' && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-center"
                >
                    <User className="w-16 h-16 text-gray-400 mb-4"/>
                    <p className="text-2xl font-bold">Connecting to {participants.doctor}...</p>
                    <p className="text-gray-400">Please wait while we establish a secure connection.</p>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Local Video Preview */}
         <motion.div 
            drag 
            dragConstraints={{ top: -20, left: -20, right: 20, bottom: 20 }}
            className="absolute top-20 right-4 w-40 h-56 rounded-lg overflow-hidden border-2 border-gray-600 shadow-2xl cursor-grab active:cursor-grabbing"
        >
           <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
           {isVideoOff && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <VideoOff className="w-10 h-10 text-white" />
                </div>
           )}
        </motion.div>
      </div>

      {/* Controls Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
        <Card className="max-w-lg mx-auto bg-black/50 backdrop-blur-md border-white/20">
          <CardContent className="p-4 flex justify-center items-center gap-4">
             <Button variant="ghost" className="w-16 h-16 rounded-full flex flex-col items-center gap-1 text-white hover:bg-white/10 hover:text-white" onClick={toggleMute}>
                {isMuted ? <MicOff className="h-6 w-6"/> : <Mic className="h-6 w-6"/>}
                <span className="text-xs">Mute</span>
            </Button>
            <Button variant="ghost" className="w-16 h-16 rounded-full flex flex-col items-center gap-1 text-white hover:bg-white/10 hover:text-white" onClick={toggleVideo}>
                 {isVideoOff ? <VideoOff className="h-6 w-6"/> : <Video className="h-6 w-6"/>}
                 <span className="text-xs">Stop Video</span>
            </Button>
             <Sheet open={isChatOpen} onOpenChange={setIsChatOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" className="w-16 h-16 rounded-full flex flex-col items-center gap-1 text-white hover:bg-white/10 hover:text-white">
                        <MessageSquare className="h-6 w-6"/>
                        <span className="text-xs">Chat</span>
                    </Button>
                </SheetTrigger>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Consultation Chat</SheetTitle>
                    </SheetHeader>
                    <div className="h-full flex flex-col pt-4">
                        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                            {chatMessages.map(msg => (
                                <div key={msg.id} className={cn("flex items-end gap-2", msg.senderId === user?.uid ? "justify-end" : "justify-start")}>
                                     {msg.senderId !== user?.uid && <Avatar className="w-6 h-6"><AvatarFallback>Dr</AvatarFallback></Avatar>}
                                     <div className={cn("max-w-[75%] p-2 px-3 rounded-2xl text-sm", msg.senderId === user?.uid ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted text-foreground rounded-bl-none')}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex gap-2">
                           <Input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Type a message..."/>
                           <Button onClick={handleSendMessage} disabled={isSending}><Send className="w-4 h-4"/></Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
            <Button variant="destructive" size="icon" className="w-16 h-16 rounded-full" onClick={hangUp}>
              <PhoneOff className="h-6 w-6" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
