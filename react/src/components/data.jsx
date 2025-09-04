import API_URL from '../config/api';

export async function handleGenerate(input) {
    try {
        const response = await fetch(`${API_URL}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: input }),
        });

        let data = await response.json();
        data = data.text;
        return data;
    } catch (error) {
        console.error("Error calling AI API:", error);
        return { error: error.message };
    }
}

export function getdata(input) {
    console.log("Sending to AI API:", input);
    return handleGenerate(input);
}


