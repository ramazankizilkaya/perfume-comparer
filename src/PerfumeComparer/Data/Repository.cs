using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;

namespace PerfumeComparer.Data;

public class Repository<T>(DbContext context) : IRepository<T> where T : class
{
    private readonly DbSet<T> _dbSet = context.Set<T>();

    // IQueryable<T> implementation
    public Type ElementType => ((IQueryable<T>)_dbSet).ElementType;
    public Expression Expression => ((IQueryable<T>)_dbSet).Expression;
    public IQueryProvider Provider => ((IQueryable<T>)_dbSet).Provider;

    public IEnumerator<T> GetEnumerator() => ((IQueryable<T>)_dbSet).GetEnumerator();
    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();

    public IQueryable<T> GetAll() => _dbSet;

    public IQueryable<T> GetAll(Expression<Func<T, bool>> where) => _dbSet.Where(where);

    public T? GetById(int id) => _dbSet.Find(id);

    public T? GetById(Guid id) => _dbSet.Find(id);

    public T? Get(Expression<Func<T, bool>> where) => _dbSet.FirstOrDefault(where);

    public IEnumerable<T> GetMany(Expression<Func<T, bool>> where) => _dbSet.Where(where).ToList();

    public void Add(T entity) => _dbSet.Add(entity);

    public void AddRange(List<T> entities) => _dbSet.AddRange(entities);

    public void Update(T entity) => _dbSet.Update(entity);

    public void Upsert(T entity) => _dbSet.Update(entity);

    public void Delete(T entity) => _dbSet.Remove(entity);

    public void Delete(Expression<Func<T, bool>> where)
    {
        var entities = _dbSet.Where(where).ToList();
        _dbSet.RemoveRange(entities);
    }

    public void Delete(List<T> entities) => _dbSet.RemoveRange(entities);
}
