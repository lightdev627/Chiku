import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Limit conversation history to prevent URL length issues
const MAX_HISTORY_LENGTH = 2000;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    
    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Received message length:', message.length);
    
    // Truncate message if too long to prevent 502 errors
    let truncatedMessage = message;
    if (message.length > MAX_HISTORY_LENGTH) {
      // Keep the most recent part of the conversation
      const lines = message.split('\n');
      let kept: string[] = [];
      let currentLength = 0;
      
      // Start from the end and work backwards
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        if (currentLength + line.length + 1 <= MAX_HISTORY_LENGTH) {
          kept.unshift(line);
          currentLength += line.length + 1;
        } else {
          break;
        }
      }
      truncatedMessage = kept.join('\n');
      console.log('Truncated message to length:', truncatedMessage.length);
    }
    
    const encoded = encodeURIComponent(truncatedMessage);
    const endpoint = `https://chiku-bots.vercel.app/Chiku?user_message=${encoded}`;
    
    console.log('Calling Chiku API with message length:', truncatedMessage.length);
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error('Chiku API error:', response.status, response.statusText);
      throw new Error(`Chiku API returned ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Chiku API response received successfully');
    
    return new Response(
      JSON.stringify({ answer: data.answer || "I'm having trouble right now. Please try again! 💫" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in chiku-chat function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to get response from Chiku';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
