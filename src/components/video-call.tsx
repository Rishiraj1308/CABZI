'use client'

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useFirebase } from '@/firebase/client-provider';
import { doc, getDoc, updateDoc, collection, addDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { Button } from './ui/button';
import { PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';

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

export default function VideoCall() {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callStatus, setCallStatus] = useState('Connecting...');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pc = useRef<RTCPeerConnection | null>(null);

  const params = useParams();
  const callId = params.id as string;
  const { db, user } = useFirebase();
  const { toast } = useToast();

  useEffect(() => {
    if (!db || !user || !callId) return;

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

      await setDoc(callDoc, { offer });

      // Listen for answer
      onSnapshot(callDoc, (snapshot) => {
        const data = snapshot.data();
        if (!pc.current?.currentRemoteDescription && data?.answer) {
          const answerDescription = new RTCSessionDescription(data.answer);
          pc.current?.setRemoteDescription(answerDescription);
        }
      });

      // Listen for ICE candidates
      onSnapshot(answerCandidates, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const candidate = new RTCIceCandidate(change.doc.data());
            pc.current?.addIceCandidate(candidate);
          }
        });
      });
    };

    setupWebRTC().catch(e => {
        console.error("WebRTC Setup failed:", e)
        toast({variant: 'destructive', title: "Video Call Failed", description: "Could not initialize video call. Please check camera/microphone permissions."})
    });

    return () => {
        pc.current?.close();
    };
  }, [callId, db, user, toast]);

  const hangUp = () => {
    pc.current?.close();
    // Redirect or update call status in Firestore
    setCallStatus('Call Ended');
    // window.close(); // or router.push(...)
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

  return (
    <div className="w-full h-screen bg-black text-white flex flex-col relative">
      <div className="flex-1 relative">
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        <div className="absolute top-4 right-4 w-40 h-56 rounded-lg overflow-hidden border-2 border-gray-600">
           <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
        <Card className="max-w-lg mx-auto bg-black/50 backdrop-blur-sm border-white/20">
          <CardContent className="p-4 flex justify-center items-center gap-4">
             <Button variant="outline" size="icon" className="bg-transparent text-white hover:bg-white/10 w-16 h-16 rounded-full" onClick={toggleMute}>
                {isMuted ? <MicOff className="h-6 w-6"/> : <Mic className="h-6 w-6"/>}
            </Button>
            <Button variant="outline" size="icon" className="bg-transparent text-white hover:bg-white/10 w-16 h-16 rounded-full" onClick={toggleVideo}>
                 {isVideoOff ? <VideoOff className="h-6 w-6"/> : <Video className="h-6 w-6"/>}
            </Button>
            <Button variant="destructive" size="icon" className="w-16 h-16 rounded-full" onClick={hangUp}>
              <PhoneOff className="h-6 w-6" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
