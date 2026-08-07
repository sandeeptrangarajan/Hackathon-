import { Query } from 'mingo';

const safeParse = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const loadCollection = (storageKey, fallback = []) => {
  return safeParse(localStorage.getItem(storageKey), fallback);
};

const saveCollection = (storageKey, collection) => {
  localStorage.setItem(storageKey, JSON.stringify(collection));
};

const findOne = (collection, criteria) => {
  return new Query(criteria).find(collection).all()[0] || null;
};

const findMany = (collection, criteria = {}, sort = null) => {
  let cursor = new Query(criteria).find(collection);
  if (sort && typeof cursor.sort === 'function') {
    cursor = cursor.sort(sort);
  }
  return cursor.all();
};

const insertOne = (collection, document) => {
  return [...collection, document];
};

const updateOne = (collection, criteria, updates) => {
  const index = collection.findIndex((item) => new Query(criteria).test(item));
  if (index < 0) return collection;
  const updated = { ...collection[index], ...updates };
  return [...collection.slice(0, index), updated, ...collection.slice(index + 1)];
};

const removeOne = (collection, criteria) => {
  return collection.filter((item) => !new Query(criteria).test(item));
};

export {
  loadCollection,
  saveCollection,
  findOne,
  findMany,
  insertOne,
  updateOne,
  removeOne
};
