import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    res.status(200).json({
        stream_io: process.env.STEAMIO_KEY!,
        agora: process.env.AGORA_KEY!,
    });
}
