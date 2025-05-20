//NFT - Trial 3
#[allow(duplicate_alias, unused_use, unused_const, unused_variable)]
module dynamic_nft::dynamic_nft;

use std::string::{Self, String};
use sui::event;
use sui::object::{Self, UID};
use sui::object_table::{Self, ObjectTable};
use sui::transfer;
use sui::tx_context::{Self, TxContext};
use sui::url::{Self, Url};

// Error codes
const NOT_OWNER: u64 = 0;

//NFT Structure
public struct DynamicNFT has key, store {
    id: UID,
    image_url: Url,
    level: u64, // Changed from counter to level
    owner: address,
    happiness: u64,
    power: u64,
    multiplier: u64, // Stored as fixed-point (multiplied by 1000)
    points: u64,
    nft_id: u64,
}

// Main collection storage (unchanged)
public struct NFTCollection has key {
    id: UID,
    counter: u64,
    nfts: ObjectTable<u64, DynamicNFT>,
    account_nfts: ObjectTable<address, ObjectTable<u64, DynamicNFT>>,
}

// Events (unchanged)
public struct Minted has copy, drop {
    nft_id: u64,
    owner: address,
    image_url: Url,
}

public struct Updated has copy, drop {
    nft_id: u64,
    field: String,
    new_value: String,
    multiplier: u64,
    level: u64,
}

public struct Fed has copy, drop {
    nft_id: u64,
    happiness: u64,
    power: u64,
    multiplier: u64,
    points: u64,
}

public struct Trained has copy, drop {
    nft_id: u64,
    happiness: u64,
    power: u64,
    multiplier: u64,
    points: u64,
}

public struct LeveledUp has copy, drop {
    nft_id: u64,
    multiplier: u64,
    level: u64,
}

// Initialization (unchanged)
fun init(ctx: &mut TxContext) {
    transfer::share_object(NFTCollection {
        id: object::new(ctx),
        counter: 0,
        nfts: object_table::new(ctx),
        account_nfts: object_table::new(ctx),
    })
}

// Mint function updated with level initialization
public entry fun mint(collection: &mut NFTCollection, image_url: String, ctx: &mut TxContext) {
    collection.counter = collection.counter + 1;
    let nft_id = collection.counter;

    let owner = tx_context::sender(ctx);
    let nft1 = DynamicNFT {
        id: object::new(ctx),
        image_url: url::new_unsafe_from_bytes(image_url.into_bytes()),
        level: 1,
        owner,
        happiness: 0,
        power: 0,
        multiplier: 1000, // 1.0 in fixed-point
        points: 0,
        nft_id: collection.counter,
    };

    let nft2 = DynamicNFT {
        id: object::new(ctx),
        image_url: url::new_unsafe_from_bytes(image_url.into_bytes()),
        level: 1,
        owner,
        happiness: 0,
        power: 0,
        multiplier: 1000, // 1.0 in fixed-point
        points: 0,
        nft_id: collection.counter,
    };

    object_table::add(&mut collection.nfts, nft_id, nft1);

    if (!object_table::contains(&collection.account_nfts, owner)) {
        object_table::add(
            &mut collection.account_nfts,
            owner,
            object_table::new(ctx),
        );
    };
    let account_nfts = object_table::borrow_mut(&mut collection.account_nfts, owner);
    object_table::add(account_nfts, nft_id, nft2);

    event::emit(Minted {
        nft_id,
        owner,
        image_url: url::new_unsafe_from_bytes(image_url.into_bytes()),
    });
}

// Feed function (public)
public entry fun feed(collection: &mut NFTCollection, nft_id: u64, ctx: &mut TxContext) {
    let nft = object_table::borrow_mut(&mut collection.nfts, nft_id);
    nft.happiness = nft.happiness + 5;
    nft.power = nft.power + 1;
    nft.multiplier = nft.multiplier + 100; // 0.1 * 1000
    update_points(nft);

    event::emit(Fed {
        nft_id,
        happiness: nft.happiness,
        power: nft.power,
        multiplier: nft.multiplier,
        points: nft.points,
    });
}

// Train function (owner only)
public entry fun train(collection: &mut NFTCollection, nft_id: u64, ctx: &mut TxContext) {
    let owner = tx_context::sender(ctx);
    let nft = object_table::borrow_mut(&mut collection.nfts, nft_id);

    assert!(nft.owner == owner, NOT_OWNER);

    nft.happiness = nft.happiness + 1;
    nft.power = nft.power + 5;
    nft.multiplier = nft.multiplier + 150; // 0.15 * 1000
    update_points(nft);

    event::emit(Trained {
        nft_id,
        happiness: nft.happiness,
        power: nft.power,
        multiplier: nft.multiplier,
        points: nft.points,
    });
}

//LevelUp Function (owner only)
public entry fun level_up_without_changes(
    collection: &mut NFTCollection,
    nft_id: u64,
    ctx: &mut TxContext,
) {
    let owner = tx_context::sender(ctx);
    let nft = object_table::borrow_mut(&mut collection.nfts, nft_id);

    assert!(nft.owner == owner, NOT_OWNER);

    nft.multiplier = nft.multiplier + 700; // 0.7 * 1000
    nft.level = nft.level + 1;
    update_points(nft);

    event::emit(LeveledUp {
        nft_id,
        multiplier: nft.multiplier,
        level: nft.level,
    });
}

// Helper function to update points
fun update_points(nft: &mut DynamicNFT) {
    nft.points = (nft.happiness + nft.power) * nft.multiplier / 1000;
}

// Updated image function with level increment
public entry fun level_up_with_changes(
    collection: &mut NFTCollection,
    nft_id: u64,
    new_url: String,
    ctx: &mut TxContext,
) {
    let owner = tx_context::sender(ctx);
    let nft = object_table::borrow_mut(&mut collection.nfts, nft_id);

    assert!(nft.owner == owner, NOT_OWNER);

    // Update image URL
    nft.image_url = url::new_unsafe_from_bytes(new_url.into_bytes());
    nft.multiplier = nft.multiplier + 700; // 0.7 * 1000
    nft.level = nft.level + 1;
    update_points(nft);

    event::emit(Updated {
        nft_id,
        field: b"image_url".to_string(),
        new_value: (new_url),
        multiplier: nft.multiplier,
        level: nft.level,
    });
}

// View functions (unchanged)
public fun get_nft(collection: &NFTCollection, nft_id: u64): &DynamicNFT {
    object_table::borrow(&collection.nfts, nft_id)
}

public fun get_account_nfts(
    collection: &NFTCollection,
    owner: address,
): &ObjectTable<u64, DynamicNFT> {
    object_table::borrow(&collection.account_nfts, owner)
}
