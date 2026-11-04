
import RunChainClient from "./RunChainClient";

export const instant = false;

export default async function RunChainPage({
                                               params,
                                           }: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    return <RunChainClient chainId={id} />;
}
