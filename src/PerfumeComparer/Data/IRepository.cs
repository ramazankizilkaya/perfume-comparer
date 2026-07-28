using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;

namespace PerfumeComparer.Data;

public interface IRepository<T> : IRepositoryBase, IQueryable<T> where T : class
{
    IQueryable<T> GetAll();
    IQueryable<T> GetAll(Expression<Func<T, bool>> where);
    T? GetById(int id);
    T? GetById(Guid id);
    T? Get(Expression<Func<T, bool>> where);
    IEnumerable<T> GetMany(Expression<Func<T, bool>> where);
    void Add(T entity);
    void AddRange(List<T> entity);
    void Update(T entity);
    void Upsert(T entity);
    void Delete(T entity);
    void Delete(Expression<Func<T, bool>> where);
    void Delete(List<T> entities);
}
