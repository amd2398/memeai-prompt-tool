
"use client";

type Props = {
    chainName: string;
    disabled: boolean;
};

export default function DeleteChainButton({
                                              chainName,
                                              disabled,
                                          }: Props) {
    return (
        <button
            type="submit"
            disabled={disabled}
            onClick={(event) => {
                if (
                    !window.confirm(
                        `Are you sure you want to permanently delete "${chainName}" and all its steps? This cannot be undone.`
                    )
                ) {
                    event.preventDefault();
                }
            }}
            className="rounded-xl border border-red-900 px-6 py-3 text-red-400 transition hover:border-red-500 hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-40"
        >
            Delete Chain
        </button>
    );
}
