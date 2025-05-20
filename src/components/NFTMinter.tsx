import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { ConnectButton } from "@suiet/wallet-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNetworkVariable } from "../networkConfig";
import NFTCard from "./NFTCard";
import { DEVHUB_OBJECT_ID } from "../constants";

// const DEVHUB_PACKAGE_ID =
//   "0xc7bdca61db4d08b5924b8486e2bcf671744450232a22a765a2e97f2758810080";

export default function NFTMinter({
  onCreated,
}: {
  onCreated: (id: string) => void;
}) {
  const dynamicNftPackageId = useNetworkVariable("dynamicNftPackageId");
  const client = useSuiClient();
  // const account = useCurrentAccount();
  const { mutate: signAndExecute, isPending: isMinting } =
    useSignAndExecuteTransaction();
  const [imageUrl, setImageUrl] = useState("");

  // Fetch all NFTs
  const { data: nfts } = useQuery({
    queryKey: ["nfts"],
    queryFn: async () => {
      const collection = await client.getObject({
        id: DEVHUB_OBJECT_ID,
        options: { showContent: true },
      });

      const nftsTableId =
        collection.data?.content?.fields?.nfts?.fields?.id?.id;

      const nfts = await client.getDynamicFields({
        parentId: nftsTableId,
      });

      return Promise.all(
        nfts.data.map(async (nft) => {
          const nftData = await client.getObject({
            id: nft.objectId,
            options: { showContent: true },
          });

          // The fields are nested in nftData.data.content.fields
          const fields = nftData.data?.content?.fields;
          console.log(nftData.data.content.fields.nft_id);
          return {
            id: nftData.data?.objectId,
            image_url: nftData.data.content.fields.image_url, // Url is a struct, value is the string
            level: nftData.data.content.fields.level,
            nft_id: nftData.data.content.fields.nft_id,
            owner: nftData.data.content.fields.owner,
            happiness: nftData.data.content.fields.happiness,
            power: nftData.data.content.fields.power,
            multiplier: nftData.data.content.fields.multiplier,
            points: nftData.data.content.fields.points,
          };
        })
      );
    },
  });

  const mintNFT = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) return;

    const txb = new Transaction();
    // const [payment] = txb.splitCoins(txb.gas, [txb.pure(1_000_000_000)]);

    txb.moveCall({
      target: `${dynamicNftPackageId}::dynamic_nft::mint`,
      arguments: [txb.object(DEVHUB_OBJECT_ID), txb.pure.string(imageUrl)],
    });

    signAndExecute(
      {
        transaction: txb,
      },
      {
        onSuccess: async ({ digest }) => {
          const { effects } = await client.waitForTransaction({
            digest: digest,
            options: {
              showEffects: true,
            },
          });

          onCreated(effects?.created?.[0]?.reference?.objectId!);
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-1 gap-8">
        {/* Left Column - Mint Form */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">
              Dynamic NFT Minter
            </h1>
            <ConnectButton className="!bg-blue-600 !text-white !px-4 !py-2 !rounded-lg" />
          </div>

          <form onSubmit={mintNFT} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image URL
              </label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter image URL (e.g. IPFS link)"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isMinting}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              {isMinting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Minting...
                </>
              ) : (
                "Mint NFT (1 SUI)"
              )}
            </button>
          </form>
        </div>

        {/* Right Column - NFT Gallery */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Your NFTs</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {nfts?.map((nft) => (
              <NFTCard key={nft.id} nft={nft} />
            ))}
          </div>
        </div>
      </div>

      {/* Evolution Modal */}
      {/* {showEvolveModal && ( */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 hidden">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 className="text-xl font-bold mb-4">Evolve Your NFT</h3>
          <p className="text-gray-600 mb-4">
            Enter a new image URL to evolve your NFT
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Image URL
            </label>
            <input
              type="text"
              // value={newImageUrl}
              // onChange={(e) => setNewImageUrl(e.target.value)}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Enter new image URL (e.g. IPFS link)"
              required
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              // onClick={() => setShowEvolveModal(null)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                // evolveNFT(showEvolveModal, newImageUrl);
                // setShowEvolveModal(null);
                // setNewImageUrl("");
              }}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Evolve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
